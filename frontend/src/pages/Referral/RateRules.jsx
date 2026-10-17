import React from 'react';
import { useSearchParams } from 'react-router-dom';
import useMediaQuery from '../../hooks/useMediaQuery';
import PopCenter from '../../components/shared/PopCenter';
import Select from '../../components/shared/Select';
import NumberInput from '../../components/shared/NumberInput';
import { coinIcon } from '../../utils/coinArt';
import { vipTier, vipTierByName, tierColor } from '../../data/vipConfig';
import useResource from '../../hooks/useResource';
import { getReferralUnlocks } from '../../services/referral';
import { fill, walletCode } from './format';
import { useSelectedCurrency } from '../../hooks/useSelectedCurrency';
import { RULES, HOW_TO_STEPS, GAME_RATES } from './referral';
import {
  IconTierBronze,
  IconTierSilver,
  IconTierGold,
  IconTierPlatinum,
  IconCalculator,
} from './icons';
import { IconArrow } from '../../layouts/MainLayout/Header/AfterLogin/icons';
import goldCoin from '../../assets/referral/coin_gold.png';

/* The Rate & Rules tab — `/referral/rules`, and the last of the four.
 *
 * `index-B5gBp3du.js` off `hash.game/assets/`, 16 KB. Every class list is the Solid template's
 * own and every string is verbatim `t("…")` or a slotted i18n value out of `index-Dn9m_cUp.js`.
 *
 * THIS PANE HAS NO FEED AT ALL, which makes it the only one of the four that is complete rather
 * than complete-and-empty. The rate boxes are literals in the markup, the Unlock Amount table is
 * a HARDCODED ARRAY in the chunk (`s = [{icon, Level, wager, amount}, …]`, ten rows), and the
 * calculator is arithmetic over three inputs. Nothing here was gated and nothing is inferred.
 *
 * The level names and their colours are NOT in that array — it carries a bare `Level` number, and
 * `u1` looks the rest up through the VIP ladder: `vipLevelRow(n).tier` for the name and
 * `tierColor(tier.base)` for the icon's inline colour. `src/data/vipConfig.js` is that ladder, the
 * captured `/game/support/vip-v2/config/` response, already in the project for the Bonus page's
 * level card — so ten rows of "Bronze I … Platinum II" fall out of it with nothing added.
 *
 * NOT BUILT, each inert at its call site: nothing. The View Rules control, its popup, the three
 * How-To cards, the calculator and the table are all here. Two branches ARE reproduced and cannot
 * be reached, both the original's own — see `validation` below, and the mobile arm of View Rules,
 * which expands the rules inline instead of opening the popup.
 */

/* `me` — the four rule paragraphs, rendered both inside the desktop popup and (on a phone)
   inline under the rate boxes. `__ENV_HOST__` expands through `ee.license.host.toUpperCase()`,
   i.e. "BC.GAME", exactly as the Buy Crypto disclaimer does. */
function RuleList() {
  return (
    <>
      {RULES.map((rule) => (
        <p key={rule.slice(0, 24)}>{fill(rule)}</p>
      ))}
    </>
  );
}

/* `D1` — the desktop popup. `M1` is its own wrapper, `flex flex-col gap-5 font-semibold
   text-secondary`, which is where the rules get their spacing; the inline arm below has none of
   that, and that difference is the chunk's. */
function RulesDialog({ open, onClose }) {
  return (
    <PopCenter open={open} onClose={onClose} title="Rules">
      <div className="flex flex-col gap-5 font-semibold text-secondary">
        <RuleList />
      </div>
    </PopCenter>
  );
}

/* One rate box. The template writes the multiplication out as separate spans so that only the
   operands take `text-primary` and the operators stay secondary — `Wager × 1% × Commission Rate ×
   28%`, where "Wager" and "Commission Rate" are translated and the two percentages are literals.

   `w` on some of those spans is a dead class — the same one the currency row carries. */
function RateBox({ rate, muted }) {
  return (
    <div className="center gap-1 rounded-lg border border-input bg-layer5 p-3 text-xs">
      <span className="text-secondary">Wager</span>
      <span className="text-secondary">&times; 1% &times;</span>
      <span className={muted ? 'w' : undefined}>Commission Rate</span>
      <span className="text-secondary">&times;</span>
      <span className={muted ? 'w' : undefined}>{rate}</span>
    </div>
  );
}

/* `C1` — the Unlock Amount table, and it is a plain `<table>` written out in the chunk rather
   than the `DataTable` the other two tabs use. Note the row cells are `flex` on a `<td>`, which
   is the original's own and is what right-aligns the amount without a column class. */
const TIER_ICON = {
  Bronze: IconTierBronze,
  Silver: IconTierSilver,
  Gold: IconTierGold,
  Platinum: IconTierPlatinum,
};

/* THE ROWS ARE THE SITE ADMIN'S NOW, not the chunk's array: `getReferralUnlocks` reads them off
   `site-config/public` and answers the capture when fixtures are on or the backend has no such
   setting yet. A live row names its level ("Bronze I") instead of numbering it, and carries the
   reward currency, whose coin replaces bc.game's gold one. Until the read settles the body is
   empty — the table is the last thing in its card, so nothing below it moves. */
function UnlockTable() {
  const { data: rows } = useResource(getReferralUnlocks);
  const cur = useSelectedCurrency();
  /* A live row carries its raw figures in the reward currency (`wagerValue`/`amountValue`), shown
     in the selected one; the capture rows (no currency) keep their verbatim strings. */
  const live = (row) => row.currency && row.wagerValue != null;
  return (
    <table className="mt-4 w-full rounded-lg bg-layer3 text-center">
      <thead className="text-secondary">
        <tr>
          <th className="px-3 py-2 text-left">Friend&apos;s Level</th>
          <th className="px-3 py-2">Total Wager</th>
          <th className="px-3 py-2 text-right">Unlock Amount</th>
        </tr>
      </thead>
      <tbody>
        {(rows ?? []).map((row) => {
          const tier = typeof row.level === 'number' ? vipTier(row.level) : vipTierByName(row.level);
          const Icon = TIER_ICON[tier.base] || IconTierBronze;
          return (
            <tr key={`${row.level}-${row.wager}`}>
              <td className="flex items-center justify-start gap-1 p-3">
                {/* `[&_svg]:size-4` on the wrapper and an inline `color` on it, which the
                    unfilled glyph inherits through `.icon`'s `fill: currentColor`. */}
                <div className="[&_svg]:size-4" style={{ color: tierColor(tier.base) }}>
                  <Icon className="icon" />
                </div>
                <span>{tier.fullName}</span>
              </td>
              <td className="p-3">
                {live(row) ? cur.show(row.wagerValue, walletCode(row.currency), { hasAlias: false, minDecimals: 0 }) : row.wager}
              </td>
              <td className="flex items-center justify-end gap-1 p-3">
                <img className="h-4 w-4" alt="coin" src={live(row) ? coinIcon(cur.code) : row.currency ? coinIcon(row.currency) : goldCoin} />
                <span className="font-extrabold text-brand">
                  {live(row) ? `+${cur.show(row.amountValue, walletCode(row.currency), { hasAlias: false, minDecimals: 2 })}` : row.amount}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* `new h(wager).times(rate).div(1e4).times(gameRate).toFixed(2, ROUND_DOWN)` — so the commission
   rate is a PERCENT-OF-PERCENT: the `1e4` is the two 1% factors the rate boxes spell out. The
   default 1000 × 25 / 10000 × 0.28 is 0.70, which is the figure the capture prints. Floored
   rather than rounded, like every other amount on this page family. */
const commission = (wager, rate, gameRate) =>
  (Math.floor(((Number(wager) * Number(rate)) / 1e4) * gameRate * 100) / 100).toFixed(2);

export default function RateRules() {
  const isDesktop = useMediaQuery('(min-width: 640px)');
  /* The calculator works in the selected currency: commission is proportional to the wager, so the
     figure needs no conversion — only the unit the wager is typed in changes. */
  const cur = useSelectedCurrency();
  const unit = cur.isFiat ? cur.code.replace(/FIAT$/, '') : cur.alias;
  const [search] = useSearchParams();

  /* ONE BUTTON, TWO SIGNALS, and they are the chunk's own: `S.mobile ? d(o => !o) : push(D1)`.
     The inline expansion and the popup are different things, so a desktop visitor never toggles
     `inlineOpen` and the chevron therefore never rotates for them — which is faithful, and is
     why these are not one piece of state. The mobile arm IS wired here, unlike most `S.mobile`
     branches in this family, because it is a state toggle rather than a second layout.

     `?rule=open` seeds the inline arm, which is the one way a desktop visitor can reach it. */
  const [inlineOpen, setInlineOpen] = React.useState(() => search.get('rule') === 'open');
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const [wager, setWager] = React.useState(1000);
  const [rate, setRate] = React.useState(25);
  const [game, setGame] = React.useState(GAME_RATES[0]);

  /* `r()` in the chunk returns a FRESH OBJECT with `wager: 0` and `commissionRate: 0` every time
     it is called, so `!!r().wager` is always false and neither error message can ever render.
     Reproduced as the constant it effectively is, rather than dressed up as validation that
     works — the four strings are real and the branch is dead, and pretending otherwise would
     invent behaviour the live page does not have. */
  const validation = { wager: 0, commissionRate: 0 };

  return (
    <div className="flex flex-col gap-4 bg-layer2 font-semibold">
      <div className="flex flex-col gap-4 md:flex-row">
        {/* ------------------------------------------------------- Commission Reward Rate */}
        <section className="relative rounded-xl bg-layer4 px-4 py-3 md:w-3/5">
          <h2 className="mb-4 border-b border-input pb-2 text-base font-extrabold text-secondary">
            Commission Reward Rate
          </h2>
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-extrabold">Casino</h2>
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="flex-1">
                <p className="mb-2 text-secondary">The Original Games</p>
                <RateBox rate="28%" />
              </div>
              <div className="flex-1">
                <p className="mb-2 text-secondary">3rd Party Slots, Live Casino</p>
                <RateBox rate="60%" muted />
              </div>
            </div>
            {/* `data` is a dead class, and the block is NOT inside the `lg:flex-row` pair above —
                All Sports gets the full width at every size. */}
            <div className="data">
              <p className="text-base font-extrabold">All Sports</p>
              <RateBox rate="100%" muted />
            </div>
          </div>

          {/* The rules expand INLINE here on a phone and open the popup on a desktop — one
              control, two behaviours, off `S.mobile`. Only the desktop arm is wired, as
              everywhere else in this family, but the inline container is the chunk's own and is
              left in place so the phone arm is one condition away. */}
          <div className="center mt-4 w-full flex-col text-secondary">
            {inlineOpen ? <RuleList /> : null}
          </div>
          <button
            type="button"
            className="button button-second button-m right-4 top-2 h-8 sm:absolute"
            onClick={() => (isDesktop ? setDialogOpen(true) : setInlineOpen((open) => !open))}
          >
            <span className="font-extrabold">View Rules</span>
            {/* `-rotate-90` closed and `rotate-90` ADDED rather than replaced when open — the two
                classes both apply and the later one wins, which is the chunk's own way of writing
                it and is why the transition reads as a flip rather than a quarter turn. */}
            <IconArrow
              className={`ml-1 size-5 -rotate-90 fill-secondary transition-all ${
                inlineOpen ? 'rotate-90' : ''
              }`}
            />
          </button>
        </section>

        {/* ---------------------------------------------------------- Commission Calculator */}
        <section className="relative rounded-xl bg-layer4 px-4 py-3 md:w-2/5">
          <div className="mb-4 flex items-center justify-between border-b border-input pb-2">
            <div className="center gap-2 text-base font-extrabold text-secondary">
              <IconCalculator className="icon size-4.5 fill-secondary" />
              <p>Commission Calculator</p>
            </div>
            {/* bc.game hard-codes USDT on this card; here it follows the selected currency. */}
            <div className="flex gap-2">
              <img className="h-4 w-4" alt="coin icon" src={coinIcon(cur.code)} />
              <span className="w">{unit}</span>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex w-10 flex-auto flex-col gap-1">
                {/* The template's own leading space between the two text nodes: the label is
                    `Wager` followed by a literal `(USDT)`. */}
                <span className="text-secondary">Wager ({unit})</span>
                <NumberInput min={1} max={1e7} value={wager} onChange={setWager} />
                {validation.wager ? (
                  <span className="error-message">
                    {validation.wager === 1 ? `Minimum 1 ${unit}` : `Maximum 10,000,000 ${unit}`}
                  </span>
                ) : null}
              </div>
              <span className="mt-5 flex-none text-nowrap text-secondary">&times; 1% &times;</span>
              <div className="flex w-10 flex-auto flex-col gap-1">
                <span className="text-secondary">Commission Rate</span>
                <NumberInput min={1} max={100} value={rate} onChange={setRate} />
                {validation.commissionRate ? (
                  <span className="error-message">
                    {validation.commissionRate === 1 ? 'Minimum 1%' : 'Range 1% - 100%'}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="w-full">
              <span className="text-secondary">Game</span>
              <Select
                className="w-full !bg-input_bright"
                value={game}
                options={GAME_RATES}
                onChange={setGame}
              >
                {(option) => option.label}
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-secondary">=</span>
              <span className="text-xl font-extrabold">
                {commission(wager, rate, game.rate)} {unit}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* ------------------------------------------------ How to Get your Referral Reward */}
      <section className="relative rounded-xl bg-layer4 px-4 py-3">
        <h2 className="mb-4 border-b border-input pb-2 text-base font-extrabold text-secondary">
          How to Get your Referral Reward
        </h2>
        <div className="flex flex-col gap-3 md:flex-row">
          {HOW_TO_STEPS.map((step, index) => (
            <div key={step.body} className="flex flex-1 gap-4 rounded-lg bg-layer5 p-4">
              <div className="text-5xl text-brand">{index + 1}</div>
              {/* `text` is a dead class. Slot 2 of each i18n value is an empty `<br>`, which is
                  what breaks the heading from its body inside one block. */}
              <div className="text">
                <span className={`mr-1 text-xl font-extrabold${step.leadBrand ? ' text-brand' : ''}`}>
                  {step.lead}
                </span>
                <span className={`text-xl font-extrabold${step.tailBrand ? ' text-brand' : ''}`}>
                  {step.tailAmountUsd ? cur.show(step.tailAmountUsd, 'USDFIAT', { precision: 0 }) : step.tail}
                </span>
                <br />
                <p className="text-secondary">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
        <UnlockTable />
      </section>

      <RulesDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
