// Direct user (koi parent nahi) ka account statement — `mssports.point_ledger_direct` se.
//
// `account-statement-v2` (UserStatementService) agent users ka statement hai: `point_ledger`,
// wallet_id se. Direct user ka us table me kuch nahi hota — uski entries (sports settlement,
// void, reversal, JS games callback) `point_ledger_direct` me hain, user_id se, apni currency me.
// Response ka shape v2 jaisa hi hai (frontend wahi table dikha sake) + `currency` har row pe.
// Ek market ki SPORTS rows v2 ki tarah ek line me judti hain — par sirf usi currency me.
import { QueryTypes } from "sequelize";
import { SportsBet_default } from "../../../models/user/SportsBet.mjs";
import { isVoidRow, stripVoidPrefix, withVoidSuffix } from "../../../lib/helper/voidLabel.mjs";
import { fanMarketName } from "../../../lib/helper/fanMarketName.mjs";
import { sportsMarketKey } from "./UserStatementService.mjs";

// TRANSACTION: what /sports/statement's "Transactions" means for a direct player — every move that
// is not a game (deposit, withdrawal, admin, bonus, transfer, stake holds).
const REPORT_TYPES = ["ALL", "SPORTS", "CASINO", "TRANSACTION"];

/** Same market + same currency ki rows ek line: delta jodo, baaki aakhri row ka. */
const groupRows = (rows, sportsBetMap) => {
  const out = [];
  const seen = {};
  for (const row of rows) {
    const market = sportsMarketKey(row, sportsBetMap);
    if (!market) {
      out.push(row);
      continue;
    }
    const key = `${row.currency}:${market}`;
    if (seen[key] === undefined) {
      seen[key] = out.length;
      out.push({ ...row });
      continue;
    }
    const merged = out[seen[key]];
    merged.delta = Number(merged.delta || 0) + Number(row.delta || 0);
    merged.created_at = row.created_at;
    merged.closing_inr_balance = row.closing_inr_balance;
    merged.remark = row.remark;
    merged.bet_id = row.bet_id;
  }
  return out;
};

const DirectStatementService = {
  REPORT_TYPES,

  /**
   * @param {{ id: number|string, db: import('sequelize').Sequelize }} target  logged-in user
   * @param {{ fromDate?, toDate?, reportType?, currency?, search?, page?, limit? }} filters
   */
  getAccountStatement: async (target, filters) => {
    const { fromDate, toDate, reportType = "ALL", currency, search } = filters;
    const page = Math.max(parseInt(filters.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 25, 1), 500);
    const where = ["user_id = :userId"];
    const replacements = { userId: String(target.id) };
    if (fromDate) {
      where.push("created_at >= :from");
      replacements.from = new Date(fromDate);
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      where.push("created_at <= :to");
      replacements.to = end;
    }
    if (reportType === "TRANSACTION") {
      where.push("category NOT IN ('SPORTS', 'CASINO', 'ORIGINAL_GAME')");
    } else if (reportType !== "ALL") {
      where.push("category = :category");
      replacements.category = reportType;
    }
    if (currency) {
      where.push("currency = :currency");
      replacements.currency = String(currency).toUpperCase();
    }
    if (search && String(search).trim()) {
      where.push("remark ILIKE :search");
      replacements.search = `%${String(search).trim()}%`;
    }
    // v2 ke column naam me (closing_inr_balance) — grouping aur mapping wahi rehti hai.
    const raw = await target.db.query(
      `SELECT id, entry_ref, event_type, category, currency, delta, balance_after AS closing_inr_balance,
              bet_id, sport_id, game_type, remark, created_at
         FROM mssports.point_ledger_direct
        WHERE ${where.join(" AND ")}
        ORDER BY id ASC`,
      { replacements, type: QueryTypes.SELECT }
    );

    const sportsBetIds = [...new Set(raw.filter((r) => r.category === "SPORTS" && r.bet_id).map((r) => Number(r.bet_id)))];
    const sportsBetMap = {};
    if (sportsBetIds.length) {
      const bets = await SportsBet_default.findAll({
        where: { id: sportsBetIds },
        attributes: ["id", "sport_id", "eventid", "match_id", "market_type", "game_type", "fancy_name", "selection_name"],
        raw: true
      });
      for (const b of bets) sportsBetMap[b.id] = b;
    }

    const grouped = groupRows(raw, sportsBetMap);
    const total = grouped.length;
    const data = grouped.slice((page - 1) * limit, page * limit).map((r) => {
      const delta = parseFloat(r.delta || 0);
      const voidRow = isVoidRow(r);
      let description = r?.remark?.split("#")[0] || r.event_type;
      if (voidRow) description = withVoidSuffix(stripVoidPrefix(description));
      const sb = r.category === "SPORTS" ? sportsBetMap[r.bet_id] : null;
      const gameType = sb?.game_type ?? r.game_type ?? null;
      return {
        date: r.created_at,
        currency: r.currency,
        credit: delta > 0 ? delta.toFixed(2) : "-",
        debit: delta < 0 ? Math.abs(delta).toFixed(2) : "-",
        closing: r.closing_inr_balance != null ? parseFloat(r.closing_inr_balance).toFixed(2) : "-",
        description,
        fromto: r?.remark?.split("#")[1] || "-",
        category: r.category || null,
        betId: r.bet_id != null ? Number(r.bet_id) : null,
        sportId: sb?.sport_id ?? r.sport_id ?? null,
        eventId: sb?.eventid ?? null,
        matchId: sb?.match_id ?? null,
        marketType: sb?.market_type ?? null,
        gameType,
        fancyName: String(gameType || "").toUpperCase() === "FAN" ? fanMarketName(sb) : null,
        // BET_SETTLEMENT | REVERSAL | VOID (settle se pehle void, delta 0)
        eventType: r.event_type || null
      };
    });

    return { success: true, data, total, totalPages: Math.ceil(total / limit), currentPage: page };
  }
};

export { DirectStatementService };
