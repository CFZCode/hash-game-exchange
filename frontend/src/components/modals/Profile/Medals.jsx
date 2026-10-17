import React from 'react';
import { useSelectedCurrency } from '../../../hooks/useSelectedCurrency';
import { useLocation, useNavigate } from 'react-router-dom';
import DialogShell from '../../shared/DialogShell';
import useResource from '../../../hooks/useResource';
import { useSession } from '../../../context/session';
import { getAllAchievements } from '../../../services/profile';
import { orderMedals, visibleMedals, medalTitle, medalIcon } from './catalogue';
import { IconMedal, IconQuestion, IconMedalCount } from './icons';
import startFlag from '../../../assets/profile/start.png';
import boxGeneric from '../../../assets/profile/achieve_box.png';
import boxIron from '../../../assets/profile/achieve_iron.png';
import boxIronOpen from '../../../assets/profile/achieve_ironOpen.png';
import boxCopper from '../../../assets/profile/achieve_copper.png';
import boxCopperOpen from '../../../assets/profile/achieve_copperOpen.png';
import boxSilver from '../../../assets/profile/achieve_silver.png';
import boxSilverOpen from '../../../assets/profile/achieve_silverOpen.png';
import boxGold from '../../../assets/profile/achieve_gold.png';
import boxGoldOpen from '../../../assets/profile/achieve_goldOpen.png';
import Skeleton from '../../shared/Skeleton';

/* `/user/medals/:userId` — Master Medals, reached from the Details link on the profile's Medals
 * card. `index-D0DujHZT.js` off `hash.game/modules/account/assets/`; see the note at the top of
 * index.jsx for how the account remote was recovered.
 *
 * TWO WHOLE PANES BEHIND ONE ROUTE, picked on whether the id is yours (`Ea`) or somebody else's
 * (`Ba`). Only yours is built: the other pane is a flat grid over `/game/support/achievement/<id>/`,
 * which answers `[]` for every id, with a "__ENV_SITE__ Master Medals" link at the foot that
 * navigates here. Nothing in this build links to another player's profile, so it is unreachable.
 * The title branches the same way — "Master Medals" for yourself, "Medals" for anyone else.
 *
 * `GET /game/support/achievement/all/` ANSWERS UNAUTHENTICATED, so every medal, every holder count
 * and every progress band on this page is a live response rather than a reconstruction — see
 * `src/data/achievements.js`. What that response cannot carry is the per-account half: `medalCount`
 * is 0, every `status` is "0", `bonusStatus` is empty. The first two are what a fresh account has
 * anyway (the capture agrees); the third is reconstructed from the chunk's own decorating `switch`,
 * and the note at BONUS_STATUS explains why the reconstruction is invisible at 0 medals.
 *
 * ── FIVE THINGS THE CHUNK SETTLES ─────────────────────────────────────────────────────────────
 *
 * "0/20 COMPLETED" IS NOT `achievements.length`. The `/20` is a LITERAL in the template
 * (`<span class="mx-1">/20</span>`) while the number before it is `o().length`, the unlocked count.
 * So a page listing 23 medals says 20 — the gold chest's own `num`, i.e. the top reward tier — and
 * that is the original's, not a miscount. Worth knowing before "fixing" it to 23.
 *
 * THE PROGRESS BAR IS 10% AT ZERO. `((medalCount / 20) * 90 + 10).toFixed(2) + "%"` — the 10 is a
 * floor so the brand fill is visible under the flag before anything is earned, which is the short
 * green stub in the capture. Its pointed right end is that fill's own `rounded-md` on a 6px bar.
 *
 * THE TICK MARKERS ABOVE IT DRAW NOTHING, ON THE LIVE SITE TOO. `[8, 28, 48, 68, 88]` sliced to
 * `floor(medalCount / 5) + 1` positions them (so one marker at zero medals, and a sixth is never
 * reached), but their class is `triangle-layerbrand` — which is in NEITHER the mirror's six
 * stylesheets NOR the current deploy's `index-DGr5jguQ.css`, both checked. Only `.triangle-layer5`
 * exists, a 12x8 border triangle in layer5. So each marker is a zero-size empty div. Reproduced
 * with the class as written, like `f-ull` and `test-base` — and do not "restore" it by borrowing
 * `.triangle-layer5`, which would add a grey arrow the original does not draw.
 *
 * A CHEST SHOWS THE GENERIC BOX UNTIL YOU QUALIFY, then its own metal, then its open twin:
 * `myAchieveCount >= num ? (claimed ? boxOpen : box) : achieve_box`. At 0 medals all four are the
 * grey `achieve_box`, which is why the capture's four chests are identical. The `_w` light-theme
 * twins are deliberately not fetched, for the reason the VIP page's light backdrops are not.
 *
 * "YOUR ACHIEVEMENTS" SHOWS THREE AND THEN A BUTTON. `f()` is `t() ? o() : o().slice(0, 3)` with a
 * Show More / Show Less button behind `o().length > 3`, and the button's own `type` flips between
 * `brand` and `second`. Empty here, so neither the rows nor the button render — the capture shows
 * the heading and the divider over nothing at all.
 *
 * THE REWARDS TOOLTIP IS THE SAME CONTENT TWICE. On a desktop the (?) opens a `fadeUp2` panel
 * pinned `absolute left-16 top-10`; on a phone it pushes a `Rewards Details` popup holding the
 * identical four lines. Only the desktop arm is built, as everywhere else here, and its four lines
 * are the chunk's own `[{5, 20}, {10, 800}, {15, 2400}, {20, 10000}]` through
 * `account2.user.achieve.detail`.
 *
 * ── NOT BUILT, each inert at its call site ────────────────────────────────────────────────────
 *
 *   the claim         a chest POSTs `/game/support/achievement/bonus/<type>/` and toasts what it
 *                     granted. Authenticated, and it needs the toast system. The chest keeps the
 *                     original's own gate and its two refusal messages are recorded at the handler.
 *   `/user/medals/item`  a medal tile navigates to it with `?type&subType&status[&time]` — the
 *                     single-medal detail dialog, `Medal-DUbmmSLY.js`, a fourth chunk. Recovered
 *                     but not built; the tile keeps its `cursor-pointer` and the query it would
 *                     carry is assembled below.
 *   the other-user pane  see above.
 */

/* `et` — the four Rewards lines. `qe.printCurrency(new B(n))` on the amounts, but with the default
   target and no currency, so they are plain dollar figures; written out rather than run through
   `printCurrency`, because the strings are what the i18n key interpolates and the amounts are
   whole dollars in every locale this build ships. */
const REWARD_LINES = [
  { number: 5, amount: 20 },
  { number: 10, amount: 800 },
  { number: 15, amount: 2400 },
  { number: 20, amount: 10000 },
];

function RewardsTooltip() {
  // The rewards are USD by design; printed in the viewer's selected currency.
  const cur = useSelectedCurrency({ site: true });
  return (
    <>
      {REWARD_LINES.map((line) => (
        <p key={line.number} className="flex items-center px-4 font-semibold">
          {/* `account2.user.achieve.detail` — "Achieve <0>__number__</0> medals: Get<1>__amount__</1>",
              with the slots carrying `mx-1` and `ml-1 text-brand`. */}
          Achieve
          <span className="mx-1">{line.number}</span>
          medals: Get
          <span className="ml-1 text-brand">{cur.show(line.amount, 'USDFIAT', { precision: 2 })}</span>
        </p>
      ))}
    </>
  );
}

/* `Ta` — the Rewards card. Its `switch (row.type)` is the whole of the chest table; the four rows
   it decorates are reconstructed in data/achievements.js, and this is the mapping it applies. */
const CHEST = {
  1: { text: '5', num: 5, box: boxIron, boxOpen: boxIronOpen },
  2: { text: '10', num: 10, box: boxCopper, boxOpen: boxCopperOpen },
  3: { text: '15', num: 15, box: boxSilver, boxOpen: boxSilverOpen },
  4: { text: 'max', num: 20, box: boxGold, boxOpen: boxGoldOpen },
};

function RewardsCard({ treasure, medalCount }) {
  const [tipOpen, setTipOpen] = React.useState(false);

  /* `s()` and `o()` — see the header note on both formulas. */
  const markers = [8, 28, 48, 68, 88].slice(0, Math.floor(medalCount / 5) + 1);
  const fill = `${((medalCount / 20) * 90 + 10).toFixed(2)}%`;

  /* `b(status, num, type)` — the claim. `status !== "0"` is "Already Achieved",
     `medalCount < num` is "Sorry! Conditions Not Met!", and the happy path GETs the bonus path and
     toasts what it granted. All three need a toast system, so the chest is inert and the branches
     are recorded here rather than half-implemented. */
  const claim = () => {};

  return (
    <div className="w-full rounded-lg bg-layer4 p-3">
      <div className="relative mb-3 flex h-8 w-full items-center">
        <IconMedal className="size-5" />
        {/* `test-base` again — the same typo as the profile's Statistics heading. */}
        <p className="test-base ml-1 font-extrabold">
          <span>Rewards</span>
        </p>
        <IconQuestion
          className="ml-1 mt-0.5 size-5 fill-secondary sm:cursor-pointer"
          onPointerEnter={() => setTipOpen(true)}
          onPointerLeave={() => setTipOpen(false)}
        />
        {tipOpen && (
          <div
            className="absolute left-16 top-10 z-10 rounded-lg bg-layer5 py-3"
            style={{ boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25)' }}
            onPointerEnter={() => setTipOpen(true)}
            onPointerLeave={() => setTipOpen(false)}
          >
            <RewardsTooltip />
          </div>
        )}
      </div>
      <div className="h-[1px] w-full bg-tertiary opacity-20" />
      <div className="mt-3 w-full">
        <div className="flex w-full items-center justify-between gap-3">
          {/* The flag is a FIFTH cell baked into the template rather than a row of the feed, which
              is why `bonusStatus` has four entries and the capture shows five boxes. */}
          <div className="flex h-20 flex-1 flex-col items-center justify-center rounded bg-layer5 pt-1">
            <img alt="start" className="h-9 w-8" src={startFlag} />
            <span className="mt-1 font-semibold text-secondary">0</span>
          </div>
          {treasure.map((row) => {
            const chest = CHEST[row.type] ?? CHEST[1];
            const qualified = medalCount >= chest.num;
            const opened = qualified && row.status !== '0';
            const src = qualified ? (opened ? chest.boxOpen : chest.box) : boxGeneric;
            return (
              <div
                key={row.type}
                className="flex h-20 flex-1 flex-col items-center justify-center rounded bg-layer5 pt-1 sm:cursor-pointer"
                onClick={claim}
              >
                <img alt="start" className="h-9 w-8" src={src} />
                <span className="mt-1 font-semibold text-secondary">{chest.text}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex h-7 w-full items-center">
          <div className="relative h-1.5 w-full bg-layer5">
            <div className="h-1.5 rounded-md bg-brand" style={{ width: fill }} />
            {markers.map((left) => (
              <div key={left} className="triangle-layerbrand absolute -top-1.5" style={{ left: `${left}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* `te` — one medal tile. `types === "lock"` is what the Awaiting-unlocking list passes, and it
   decides three things at once: which artwork, whether the footer is a holder count or the date you
   earned it, and whether the detail query carries a `time`. */
function MedalTile({ row, locked }) {
  const navigate = useNavigate();

  return (
    <div
      className="mt-2 flex h-36 w-[32%] cursor-pointer flex-col items-center justify-center rounded-lg bg-layer5 font-semibold"
      onClick={() =>
        navigate(
          `/user/medals/item/?type=${row.type}&subType=${row.subType}&status=${row.status}` +
            (locked ? '' : `&time=${row.createTime}`),
        )
      }
    >
      <img className="h-15 w-11" alt="" src={medalIcon(row.type, row.subType, locked)} />
      <div className="mt-2 text-center text-xs">{medalTitle(row)}</div>
      {locked ? (
        <div className="mt-1.5 flex h-5 items-center rounded bg-layer4 px-2">
          <IconMedalCount className="size-4 fill-brand" />
          <span className="ml-1 text-xs text-brand">{row.count}</span>
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-secondary">
          {new Date(row.createTime).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

export default function Medals({ onClose, enter }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { session } = useSession();
  const [expanded, setExpanded] = React.useState(false);

  /* Read off the pathname rather than with `useParams`, for the reason index.jsx records. */
  const userId = Number(pathname.split('/').pop() || '0');
  const isMyself = session.userId === userId;
  /* The id and session go to the read so live mode can ask for THIS player's medals (gap 9);
     fixture mode ignores both and answers the captured catalogue as before. */
  const read = React.useCallback(() => getAllAchievements(userId, session), [userId, session]);
  const { data, loading } = useResource(read);

  const all = data?.achievements ?? [];
  /* `fe(Le(all))` — `orderMedals` over a lodash `cloneDeep`, then split by status. The clone is
     there because `orderMedals` mutates its input on the original; ours copies, so it is a no-op. */
  const ordered = visibleMedals(orderMedals(all));
  const unlocked = ordered.filter((row) => String(row.status) === '1');
  const awaiting = ordered.filter((row) => String(row.status) === '0');
  const shown = expanded ? unlocked : unlocked.slice(0, 3);

  return (
    <DialogShell
      title={isMyself ? 'Master Medals' : 'Medals'}
      onClose={onClose}
      /* `o()` = `Bd(navigate, stacks.list[index() - 1], 1, navDepth())` — the arrow pops ONE, where
         the cross pops the whole stack. One step of history lands in the same place here, because
         the profile dialog is a real route. */
      onBack={() => navigate(-1)}
      enter={enter}
    >
      <div className="pt-4">
        <RewardsCard treasure={data?.bonusStatus ?? []} medalCount={data?.medalCount ?? 0} />

        <div className="mt-3 w-full rounded-lg bg-layer4 p-3">
          <div className="flex h-8 w-full items-center">
            <p className="text-base font-extrabold">Your achievements</p>
            <p className="ml-auto text-secondary">
              {unlocked.length}
              {/* `/20` is a literal — see the header note.

                  ONE DEPARTURE, REQUESTED, AND IT IS A ONE-WORD REVERT: the chunk writes `mx-1`,
                  which opens 4px on BOTH sides and reads as "0 /20 Completed". `mr-1` drops the
                  left half so the fraction closes up against the count. It also happens to match
                  the capture, which reads "0/20 Completed" with no gap before the slash — so the
                  4px was arguably never visible on the live page either. Put `mx-1` back to
                  restore the chunk exactly. */}
              <span className="mr-1">/20</span>
              <span>Completed</span>
            </p>
          </div>
          <div className="mb-2 mt-3 h-[1px] w-full bg-tertiary opacity-20" />
          <div className="flex flex-wrap items-center gap-[2%]">
            {shown.map((row) => (
              <MedalTile key={`${row.type}_${row.subType}`} row={row} locked={false} />
            ))}
            {unlocked.length > 3 && (
              <button
                type="button"
                className={`button button-m mt-3 h-10 w-full ${
                  expanded ? 'button-second' : 'button-brand'
                }`}
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? 'Show Less' : 'Show More'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 w-full rounded-lg bg-layer4 p-3">
          <div className="flex h-8 w-full items-center">
            <p className="text-base font-extrabold">Awaiting unlocking</p>
          </div>
          <div className="mb-2 mt-3 h-[1px] w-full bg-tertiary opacity-20" />
          <div className="flex flex-wrap items-center gap-[2%]">
            {/* `achievement/all/` answers unauthenticated and is 23 rows, all of them awaiting on
                this account — so this is the grid that fills and the one above it stays empty.
                Placeholders at `MedalTile`'s own box (`h-36 w-[32%]`, `mt-2`), three across, so
                the card is already the height a first row will need. */}
            {loading
              ? Array.from({ length: 3 }, (unused, i) => (
                  <Skeleton
                    key={`skeleton-${i}`}
                    className="mt-2 block h-36 w-[32%] rounded-lg"
                    radius={0}
                  >
                    <div className="size-full" />
                  </Skeleton>
                ))
              : awaiting.map((row) => (
                  <MedalTile key={`${row.type}_${row.subType}`} row={row} locked />
                ))}
          </div>
        </div>

        <p className="mb-6 mt-3 w-full px-6 text-center text-xs font-semibold text-brand">
          Medal progression stats updated every 24 hours.
        </p>
      </div>
    </DialogShell>
  );
}
