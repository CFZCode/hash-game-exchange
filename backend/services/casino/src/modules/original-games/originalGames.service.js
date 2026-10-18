'use strict';

const crypto = require('crypto');
const { QueryTypes } = require('sequelize');
const { money } = require('@ibitplay/common');

const E = require('./originalGames.errors');
const { sign } = require('./provider/client');
const { addChildGamePoints, addDirectGamePoints } = require('../js-games/pointLedger');
const {
  EXPONENT,
  ACTION,
  ERROR_CODE,
  MAX_SKEW_SECONDS,
  NONCE_TTL_SECONDS,
  WAGER_SOURCE,
} = require('./originalGames.constants');

/**
 * Original Games Aggregator — a seamless wallet (integration guide §5). Player money stays here;
 * the aggregator calls `balance` / `bet` / `win` / `rollback` and our answer is authoritative.
 *
 * The rules the guide makes mandatory, and where each is kept:
 *   - every callback is HMAC-checked, ≤60 s old and carries an unseen nonce        #verify
 *   - `transaction_id` is the dedupe key; a repeat returns the ORIGINAL answer     #applyMoney
 *     (balance after the first application, same `operator_tx_id`)
 *   - INSUFFICIENT_FUNDS debits nothing (they void the round and send no rollback)
 *   - a rollback of an unknown id is a 200 no-op and refuses that bet if it arrives later
 *   - a second rollback of the same original is a 200 with the current balance
 *   - a rollback reverses OUR recorded amount, never the request's
 *
 * Like GIS, the `og_transactions` row is written before the wallet moves, inside one DB
 * transaction, so the unique index — not a read — decides a race. The wallet call is keyed on
 * the same id, so a commit that fails after the wallet moved is repaired by the retry.
 */
class OriginalGamesService {
  constructor({ db, models, config, logger, wallet, provider, games }) {
    this.db = db;
    this.models = models;
    this.config = config;
    this.logger = logger;
    this.wallet = wallet;
    this.provider = provider;
    this.games = games;
  }

  // ══════════════════════════════════════════════════════════════════════
  //  Launch
  // ══════════════════════════════════════════════════════════════════════

  /** The mode follows the credential (guide §4, §11.1): sandbox keys open demo sessions only. */
  get mode() {
    return this.config.OG_ENV === 'production' ? 'real' : 'demo';
  }

  async launch({ userId, gameCode, currency, device, language }) {
    if (!this.provider?.configured) throw E.NOT_CONFIGURED();
    const code = String(currency).toUpperCase();
    if (!EXPONENT[code]) throw E.UNSUPPORTED_CURRENCY({ currency });

    const user = await this.models.Users.findByPk(userId, {
      attributes: ['id', 'name', 'casino_locked', 'system_locked'],
      raw: true,
    });
    if (user?.casino_locked || user?.system_locked) throw E.CASINO_LOCKED({ userId });

    let response;
    try {
      response = await this.provider.request('POST', '/v1/sessions/launch', {
        idempotencyKey: crypto.randomUUID(),
        body: this.#compact({
          player: this.#compact({ id: String(userId), nickname: user?.name ? String(user.name).slice(0, 64) : undefined, language }),
          game_code: gameCode,
          currency: code,
          mode: this.mode,
          platform: device,
          return_url: this.config.OG_RETURN_URL,
          deposit_url: this.config.OG_DEPOSIT_URL,
          session_ttl_seconds: 3600,
        }),
      });
    } catch (error) {
      if (!error?.status) throw E.UPSTREAM_FAILED({ cause: error?.message });
      if (error.status === 503) throw E.MAINTENANCE({ code: error.code });
      // A 4xx (GAME_DISABLED, MODE_NOT_AVAILABLE, CURRENCY_*) is configuration: it is surfaced
      // with its code and never retried.
      throw E.UPSTREAM_REJECTED({ status: error.status, code: error.code });
    }
    if (!response?.launch_url || !response?.session_id) throw E.UPSTREAM_REJECTED({ code: 'NO_LAUNCH_URL' });

    await this.#query(
      `INSERT INTO og_sessions (session_id, user_id, game_code, currency, mode)
       VALUES (:sessionId, :userId, :gameCode, :currency, :mode) ON CONFLICT (session_id) DO NOTHING`,
      { sessionId: response.session_id, userId: String(userId), gameCode, currency: code, mode: this.mode }
    );

    return { gameLaunchUrl: response.launch_url, sessionId: response.session_id, mode: this.mode };
  }

  // ══════════════════════════════════════════════════════════════════════
  //  Wallet callbacks — always resolve to `{ status, body }`
  // ══════════════════════════════════════════════════════════════════════

  async callback(action, { body, rawBody, headers, method, path, query }) {
    try {
      const refusal = await this.#verify({ rawBody, headers, method, path, query });
      if (refusal) return refusal;

      const currency = String(body?.currency ?? '');
      if (!EXPONENT[currency]) return this.#error(ERROR_CODE.CURRENCY_MISMATCH, { currency });
      const playerId = String(body?.player_id ?? '');
      if (!/^\d{1,18}$/.test(playerId)) return this.#error(ERROR_CODE.PLAYER_NOT_FOUND, { currency });
      const userId = Number(playerId);

      const balance = await this.#balanceOf(userId, currency);
      if (balance == null) return this.#error(ERROR_CODE.PLAYER_NOT_FOUND, { currency });

      const session = await this.#session(body.session_id);
      if (session && String(session.user_id) !== playerId) return this.#error(ERROR_CODE.SESSION_EXPIRED, { currency });
      if (session && session.currency !== currency) return this.#error(ERROR_CODE.CURRENCY_MISMATCH, { currency });

      const ctx = { body, userId, currency, balance };
      switch (action) {
        case ACTION.BALANCE:
          return this.#ok(balance, currency);
        case ACTION.BET:
          return await this.#bet(ctx);
        case ACTION.WIN:
          return await this.#win(ctx);
        case ACTION.ROLLBACK:
          return await this.#rollback(ctx);
        default:
          return this.#error(ERROR_CODE.INTERNAL, { currency });
      }
    } catch (error) {
      this.logger?.error({ err: error, action, txId: body?.transaction_id }, 'Original games callback failed');
      return this.#error(ERROR_CODE.INTERNAL, { currency: body?.currency });
    }
  }

  async #bet({ body, userId, currency, balance }) {
    const amount = this.#amount(body.amount, currency);
    const txId = String(body.transaction_id ?? '');
    if (amount == null || !txId) return this.#error(ERROR_CODE.INTERNAL, { currency });

    const seen = await this.#tx(txId);
    if (seen) return this.#replay(seen, currency);

    // Rolled back before it reached us (guide §5.4 rule 1): refused, nothing moves.
    const [voided] = await this.#query(
      `SELECT 1 FROM og_transactions WHERE kind = 'rollback' AND reference_transaction_id = :txId LIMIT 1`,
      { txId }
    );
    if (voided) {
      this.logger?.warn({ txId, userId }, 'Original games bet arrived after its rollback — refused');
      return this.#error(ERROR_CODE.INTERNAL, { currency, balance });
    }

    const user = await this.models.Users.findByPk(userId, { attributes: ['casino_locked', 'system_locked'], raw: true });
    if (user?.casino_locked || user?.system_locked) return this.#error(ERROR_CODE.PLAYER_BLOCKED, { currency, balance });

    const outcome = await this.#applyMoney({ kind: 'bet', body, userId, currency, amount, balance, txId, isCredit: false });
    if (outcome.insufficient) return this.#error(ERROR_CODE.INSUFFICIENT_FUNDS, { currency, balance });

    if (outcome.fresh && !money.isZero(amount) && this.games?.recordActivity) {
      await this.games.recordActivity({ userId, gameRef: null, wagered: amount, currency, source: WAGER_SOURCE, ref: txId });
    }
    return outcome.response;
  }

  async #win({ body, userId, currency, balance }) {
    const amount = this.#amount(body.amount, currency);
    const txId = String(body.transaction_id ?? '');
    if (amount == null || !txId) return this.#error(ERROR_CODE.INTERNAL, { currency });

    const seen = await this.#tx(txId);
    if (seen) return this.#replay(seen, currency);

    const outcome = await this.#applyMoney({ kind: 'win', body, userId, currency, amount, balance, txId, isCredit: true });
    return outcome.response;
  }

  async #rollback({ body, userId, currency, balance }) {
    const txId = String(body.transaction_id ?? '');
    const refId = String(body.reference_transaction_id ?? '');
    if (!txId || !refId) return this.#error(ERROR_CODE.INTERNAL, { currency });

    // A repeat of this rollback, or any earlier rollback of the same original: 200, current balance.
    if (await this.#tx(txId)) return this.#ok(balance, currency);
    const [already] = await this.#query(
      `SELECT 1 FROM og_transactions WHERE kind = 'rollback' AND reference_transaction_id = :refId LIMIT 1`,
      { refId }
    );
    if (already) return this.#ok(balance, currency);

    const original = await this.#tx(refId);
    if (!original || original.kind === 'rollback' || String(original.user_id) !== String(userId)) {
      // Never applied here: recorded as a no-op so the late bet is refused (rule 1).
      await this.#insert({ kind: 'rollback', status: 'noop', body, userId, currency, amount: '0', txId, refId, balanceAfter: balance })
        .catch((error) => { if (error?.name !== 'SequelizeUniqueConstraintError') throw error; });
      return this.#ok(balance, currency);
    }

    const amount = money.fromStored(original.amount);
    const isCredit = original.kind === 'bet'; // undoing a bet pays back; undoing a win takes back
    const outcome = await this.#applyMoney({ kind: 'rollback', body, userId, currency, amount, balance, txId, refId, isCredit });

    if (outcome.insufficient) {
      // The player already spent the win. Not something a retry fixes, so it is acknowledged and
      // left for an operator — recorded `unfunded`, logged loudly.
      await this.#insert({ kind: 'rollback', status: 'unfunded', body, userId, currency, amount, txId, refId, balanceAfter: balance })
        .catch((error) => { if (error?.name !== 'SequelizeUniqueConstraintError') throw error; });
      this.logger?.error({ userId, refId, amount, currency }, 'Original games rollback could not be funded — NEEDS MANUAL RECONCILIATION');
      return this.#ok(balance, currency);
    }

    if (outcome.fresh && isCredit && this.games?.reverseActivity) {
      await this.games
        .reverseActivity({ userId, source: WAGER_SOURCE, ref: refId, outbox: true })
        .catch((error) => this.logger?.warn({ err: error, refId }, 'Wager reversal failed — the rollback stands'));
    }
    return outcome.duplicate ? this.#ok(balance, currency) : outcome.response;
  }

  /**
   * One movement: row first, then the wallet, in one DB transaction. Returns
   * `{ response, fresh }`, `{ insufficient: true }`, or the original answer on a race.
   */
  async #applyMoney({ kind, body, userId, currency, amount, balance, txId, refId = null, isCredit }) {
    const reason = { bet: 'BET_STAKE', win: 'BET_PAYOUT', rollback: 'BET_ROLLBACK' }[kind];
    try {
      const { id, after } = await this.db.transaction(async (transaction) => {
        const rowId = await this.#insert({ kind, status: 'applied', body, userId, currency, amount, txId, refId, balanceAfter: balance }, transaction);
        if (money.isZero(amount)) return { id: rowId, after: balance };

        const movement = await this.wallet[isCredit ? 'credit' : 'debit']({
          userId,
          currency,
          amount,
          reason,
          ref: { type: 'OG', id: txId },
          description: `original-games ${kind} ${txId}`,
        });
        const newBalance = money.toDecimalString(money.toMinorQuantised(String(movement.newBalance)));
        await this.#query('UPDATE og_transactions SET balance_after = :after WHERE id = :id', { after: newBalance, id: rowId }, transaction);
        return { id: rowId, after: newBalance };
      });

      if (!money.isZero(amount)) await this.#writePoints({ userId, currency, amount, isCredit, txId, kind, body, balanceAfter: after });
      return { fresh: true, response: this.#ok(after, currency, { operator_tx_id: this.#operatorTxId(id) }) };
    } catch (error) {
      if (error?.name === 'SequelizeUniqueConstraintError') {
        const seen = await this.#tx(txId);
        return { duplicate: true, response: seen ? this.#replay(seen, currency) : this.#ok(balance, currency) };
      }
      if (error?.code === 'WALLET_INSUFFICIENT_FUNDS' || error?.status === 402) return { insufficient: true };
      throw error;
    }
  }

  /** A repeat of an applied transaction: the ORIGINAL balance and `operator_tx_id`. */
  #replay(row, currency) {
    if (row.kind === 'rollback') return this.#ok(row.balance_after ?? '0', currency);
    return this.#ok(row.balance_after ?? '0', currency, { operator_tx_id: this.#operatorTxId(row.id) });
  }

  async #insert({ kind, status, body, userId, currency, amount, txId, refId = null, balanceAfter }, transaction) {
    const [row] = await this.#query(
      `INSERT INTO og_transactions
         (transaction_id, kind, status, user_id, session_id, round_id, game_code, currency, amount,
          reference_transaction_id, balance_after)
       VALUES (:txId, :kind, :status, :userId, :sessionId, :roundId, :gameCode, :currency, :amount, :refId, :balanceAfter)
       RETURNING id`,
      {
        txId,
        kind,
        status,
        userId: String(userId),
        sessionId: body.session_id ?? null,
        roundId: body.round_id ?? null,
        gameCode: body.game_code ?? null,
        currency,
        amount,
        refId: refId ?? body.reference_transaction_id ?? null,
        balanceAfter,
      },
      transaction
    );
    return row.id;
  }

  // ── Callback plumbing ────────────────────────────────────────────────

  /** null when genuine, fresh and unseen; otherwise the refusal to send. */
  async #verify({ rawBody, headers, method, path, query }) {
    if (!this.provider?.configured) {
      this.logger?.error('Original games credentials are not configured — refusing callbacks');
      return { status: 503, body: { status: 'ERROR', error_code: ERROR_CODE.MAINTENANCE } };
    }
    const timestamp = String(headers['x-timestamp'] ?? '');
    const nonce = String(headers['x-nonce'] ?? '');
    const sent = String(headers['x-signature'] ?? '');
    const expected = sign(this.provider.webhookSecret, {
      method,
      path,
      query,
      timestamp,
      nonce,
      body: rawBody ?? Buffer.alloc(0),
    });
    const unauthorised = (why) => {
      this.logger?.warn({ why, path }, 'REJECTED original games callback');
      return { status: 401, body: { status: 'ERROR', error_code: why } };
    };

    if (!sent || !this.#safeEqual(sent, expected)) return unauthorised('INVALID_SIGNATURE');
    const seconds = Number(timestamp);
    if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > MAX_SKEW_SECONDS) {
      return unauthorised('REQUEST_EXPIRED');
    }
    if (nonce.length < 16) return unauthorised('REPLAY_DETECTED');
    const fresh = await this.#query(
      'INSERT INTO og_nonces (nonce) VALUES (:nonce) ON CONFLICT (nonce) DO NOTHING RETURNING nonce',
      { nonce }
    );
    if (!fresh.length) return unauthorised('REPLAY_DETECTED');
    // shortcut: pruned on ~1% of callbacks; move to a timer if og_nonces ever shows up in slow logs.
    if (Math.random() < 0.01) {
      await this.#query(`DELETE FROM og_nonces WHERE seen_at < NOW() - make_interval(secs => :ttl)`, {
        ttl: NONCE_TTL_SECONDS * 5,
      }).catch(() => {});
    }
    return null;
  }

  #safeEqual(a, b) {
    const bufA = crypto.createHash('sha256').update(String(a)).digest();
    const bufB = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(bufA, bufB);
  }

  /** Integer minor units → wallet decimal string; null when not a non-negative JSON integer. */
  #amount(value, currency) {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return money.toDecimalString(BigInt(value) * 10n ** BigInt(8 - EXPONENT[currency]));
  }

  /** Wallet decimal → integer minor units, rounded DOWN so we never report more than is held. */
  #minor(balance, currency) {
    const scaled = money.toMinorQuantised(String(balance ?? '0')) / 10n ** BigInt(8 - EXPONENT[currency]);
    return Number(scaled < 0n ? 0n : scaled);
  }

  #ok(balance, currency, extra = {}) {
    return { status: 200, body: { status: 'OK', balance: this.#minor(balance, currency), currency, ...extra } };
  }

  #error(code, { currency, balance } = {}) {
    const body = { status: 'ERROR', error_code: code };
    if (balance != null && EXPONENT[currency]) body.balance = this.#minor(balance, currency);
    if (currency) body.currency = currency;
    return { status: 200, body };
  }

  #operatorTxId(id) {
    return `og-${id}`;
  }

  async #tx(txId) {
    const [row] = await this.#query('SELECT * FROM og_transactions WHERE transaction_id = :txId', { txId });
    return row ?? null;
  }

  async #session(sessionId) {
    if (!sessionId) return null;
    const [row] = await this.#query('SELECT user_id, currency FROM og_sessions WHERE session_id = :sessionId', {
      sessionId: String(sessionId),
    });
    return row ?? null;
  }

  async #balanceOf(userId, currency) {
    try {
      const result = await this.wallet.balance(userId, currency);
      const value = result == null ? null : typeof result === 'object' ? result.balance ?? null : result;
      return value == null ? null : money.fromStored(String(value));
    } catch (error) {
      if (error?.status === 404) return null;
      throw error;
    }
  }

  /** Point ledger, as GIS / JS games: agent child → `point_ledger` (INR), every player → direct. */
  async #writePoints({ userId, currency, amount, isCredit, txId, kind, body, balanceAfter }) {
    const sequelize = this.db.sequelize;
    const entry = {
      userId,
      delta: isCredit ? amount : money.toDecimalString(money.negate(amount)),
      entryRef: `og:${txId}`,
      gameType: body.game_code ?? null,
      remark: `Original games ${kind} ${txId}`,
    };
    try {
      if (currency === 'INR') await addChildGamePoints(sequelize, entry);
      await addDirectGamePoints(sequelize, { ...entry, currency, balanceAfter });
    } catch (error) {
      this.logger?.error({ err: error, txId, userId }, 'Original games point ledger write failed — all_point drift');
    }
  }

  #query(sql, replacements, transaction) {
    return this.db.sequelize.query(sql, { replacements, type: QueryTypes.SELECT, transaction });
  }

  #compact(object) {
    return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== null && value !== ''));
  }
}

module.exports = { OriginalGamesService };
