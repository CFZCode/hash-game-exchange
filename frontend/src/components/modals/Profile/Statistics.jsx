import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DialogShell from '../../shared/DialogShell';
import EmptyPlaceholder from '../../shared/EmptyPlaceholder';
import Select from '../../shared/Select';
import Pagination from '../../shared/Pagination';
import useResource from '../../../hooks/useResource';
import { IconArrow } from '../../shared/icons';
import { useSession } from '../../../context/session';
import { useGates } from '../../../context/gates';
import { getAlias } from '../../../utils/currency';
import { useSelectedCurrency } from '../../../hooks/useSelectedCurrency';
import { coinIcon } from '../../../utils/coinArt';
import {
  getGameSummary,
  getGameDetail,
  getStatisticsGames,
  PAGE_SIZE,
} from '../../../services/profile';
import { IconStatistics, IconTotalWins, IconTotalBets, IconTotalWagered } from './icons';
import { avatarSrc } from '../../../services/avatars';

/* `/user/statistics` — Statistics details, reached from the Details link on the profile's Statistics
 * card. `index-DVoHgAYe.js` off `hash.game/modules/account/assets/`; see index.jsx for how the
 * account remote was recovered.
 *
 * **NOT A ROUTE PARAM — A QUERY STRING.** The profile navigates to
 * `/user/statistics/?userId=…&userName=…`, so the account is read from search params rather than
 * from the path, unlike its two siblings. That is the router's own arrangement (the route is a bare
 * `/user/statistics`) and it is why the dialog can print a name it never fetched.
 *
 * ── ONE FEED ANSWERS AND ONE DOES NOT, AND THE SPLIT IS INSTRUCTIVE ───────────────────────────
 *
 * `GET /game/support/user/game/summary/?userId=&gameUrl=` ANSWERS UNAUTHENTICATED for ANY id — it
 * aggregates public bet history, so 105522617 comes back with 25568 bets and $24,659.79 wagered.
 * For this build's own fixture account id it answers `{betNum: 0, winNum: 0, betAmountUsd: "0"}`,
 * which is the capture's three zeros arrived at without looking at the screenshot.
 *
 * `POST /game/support/user/game/detail/` is 403. So the per-currency table is empty and the pane
 * renders the site's own "Stay tuned-something's coming!", which is exactly what the capture shows.
 * Same prefix, same userId argument, opposite answers: an AGGREGATE is public, the ROWS behind it
 * are not.
 *
 * ── THREE THINGS THE CHUNK SETTLES ────────────────────────────────────────────────────────────
 *
 * THE DROPDOWN IS THE ORIGINALS SELECTION, AND "GLOBAL" IS A SENTINEL. `l.list` starts as
 * `[{label: "Global", value: "Global"}]` and the fetched games are CONCATENATED onto it, so Global
 * is the first row rather than a special case in the renderer — and both request functions map the
 * string back to `""` on the way out. Its filter drops one row by exact name, `CrashTrenball`,
 * where the Help Center's picker over the same endpoint drops any trenball slug AND any name with a
 * colon; see services/profile.js.
 *
 * ITS TRIGGER IS A CUSTOM `labelRender`, not a plain label: `Details:` in secondary, the game name
 * in brand green, and the chevron in a `bg-layer6` square pushed right with `ml-auto`. The border is
 * an inline `1px solid rgba(228, 234, 240, 0.10)` rather than a token — the original's own literal,
 * and it is `--color-third`'s #e4eaf019 to within a rounding step, so it is written as given.
 *
 * THE THREE CELLS ARE THE PROFILE CARD'S, ONE LABEL APART. "Total Bets" here against "Total Bet
 * Counts" there, same icons, same `w-[49%]` / `mt-2 w-full` index rule. Not extracted to a shared
 * component: they are two templates in two chunks that happen to agree, and the label difference is
 * exactly the kind of thing a shared component would quietly normalise away.
 *
 * ── NOT BUILT, each inert at its call site ────────────────────────────────────────────────────
 *
 *   the row renderer   built (Currency / Win / Bet / Wagered), but no fixture can reach it.
 *   the pager          `total` is 0, so it has nothing to page.
 *   `get_device_info`  the dropdown's own selection POST carries `areaCode` and `distinctId` from
 *                      an app-shell event. `services/profile.js` reuses the project's existing
 *                      selection reader instead, which already has that hole documented.
 */

export default function Statistics({ onClose, enter }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { session } = useSession();
  // Wagered totals are USD by design; printed in the viewer's selected currency.
  const cur = useSelectedCurrency({ site: true });
  const { agentPlayer } = useGates();

  const userId = Number(params.get('userId') || '0');
  /* An agent's player sees no wagered figures on their own statistics (as on the profile card). */
  const hideWagered = agentPlayer && userId === session.userId;
  const userName = params.get('userName') || '';

  const [game, setGame] = React.useState({ label: 'Global', value: 'Global' });
  const [page, setPage] = React.useState(1);

  const { data: games } = useResource(getStatisticsGames);
  const options = React.useMemo(
    () => [{ label: 'Global', value: 'Global' }, ...(games ?? [])],
    [games],
  );

  const readSummary = React.useCallback(
    () => getGameSummary(userId, game.value),
    [userId, game.value],
  );
  const { data: summary } = useResource(readSummary);

  const readDetail = React.useCallback(
    () => getGameDetail({ userId, gameUrl: game.value, page }),
    [userId, game.value, page],
  );
  const { data: detail, loading: detailLoading } = useResource(readDetail);

  const rows = detail?.list ?? [];
  const total = detail?.total ?? 0;

  const cells = [
    { label: 'Total Wins', Icon: IconTotalWins, count: summary?.winNum },
    { label: 'Total Bets', Icon: IconTotalBets, count: summary?.betNum },
    {
      label: 'Total Wagered',
      Icon: IconTotalWagered,
      count: cur.show(summary?.betAmountUsd || '0', 'USDFIAT'),
    },
  ].filter((cell) => !(hideWagered && cell.label === 'Total Wagered'));

  return (
    <DialogShell
      title="Statistics details"
      onClose={onClose}
      onBack={() => navigate(-1)}
      enter={enter}
    >
      <div className="mt-4 flex w-full items-center">
        <Select
          className="flex-1 border-none p-0"
          value={game}
          options={options}
          onChange={(option) => {
            setGame(option);
            /* `m(0)` — changing the game resets the pager, and it does so in the change handler
               rather than in an effect, which is this project's own rule as well. */
            setPage(1);
          }}
          labelRender={(value) => (
            <div
              className="flex h-full w-full items-center rounded-lg bg-layer3 pl-3 pr-2 font-semibold"
              style={{ border: '1px solid rgba(228, 234, 240, 0.10)' }}
            >
              <span className="text-secondary">Details</span>
              <span className="text-secondary">:</span>
              <span className="ml-1 text-brand">{value.label}</span>
              {/* A `<div>`, not a `<button>` — `labelRender` renders INSIDE `Select`'s trigger,
                  which is itself a `<button>`, and a nested button is invalid HTML that React
                  reports and a browser silently unnests. It is also what the shared component
                  does in this exact slot: `defaultLabel`'s chevron square is a plain div. Same
                  call the deposit chip's label and the Do Not Disturb switch each document. */}
              <div className="center ml-auto h-6 w-6 rounded-lg bg-layer6">
                <IconArrow className="size-4 -rotate-90" />
              </div>
            </div>
          )}
        >
          {(option) => <span className="whitespace-nowrap">{option.label}</span>}
        </Select>
        <img alt="avatar" className="ml-2 h-9 w-9 rounded-full" src={avatarSrc(userId === session.userId ? session.avatar : '')} />
        <p className="ml-2 whitespace-nowrap font-extrabold">{userName || '-'}</p>
      </div>

      <div className="mt-3 w-full rounded-lg bg-layer4 p-3">
        <div className="flex h-8 w-full items-center">
          <IconStatistics className="size-5" />
          <span className="ml-1 text-base font-extrabold">Statistics</span>
        </div>
        <div className="my-3 h-[1px] w-full bg-tertiary opacity-20" />
        <div className="mt-3 flex w-full flex-wrap items-center justify-between">
          {cells.map(({ label, Icon, count }, index) => (
            <div
              key={label}
              /* `y-3` is a dead class here too — see the profile card. */
              className={`y-3 flex h-[4.375rem] flex-none flex-col items-center justify-center overflow-hidden rounded-lg bg-layer5 pt-1 ${
                index <= 1 ? 'w-[49%]' : 'mt-2 w-full'
              }`}
            >
              <div className="flex w-full items-center justify-center">
                <Icon className="mr-1 size-5 flex-none fill-secondary" />
                <span className="text-xs">{label}</span>
              </div>
              <p className="mt-0.5 text-center text-lg font-semibold">{count || '0'}</p>
            </div>
          ))}
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="my-3 w-full rounded-lg bg-layer4 p-3">
          <table className="w-full">
            <thead>
              <tr className="h-11 px-3 font-extrabold">
                <th className="text-left">Currency</th>
                <th className="text-center">Win</th>
                <th className="text-center">Bet</th>
                {!hideWagered && <th className="text-right">Wagered</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.currencyName} className="h-11 px-3 font-extrabold">
                  <td className="flex h-11 items-center">
                    <img alt="coin" className="w-4" src={coinIcon(row.currencyName)} />
                    <span className="ml-1.5">{getAlias(row.currencyName)}</span>
                  </td>
                  <td className="text-center">{Number(row.winNum)}</td>
                  <td className="text-center">{Number(row.betNum)}</td>
                  {!hideWagered && (
                    <td className="text-right">
                      {cur.show(row.betAmountUsd || '0', 'USDFIAT')}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {/* The original passes `{current, total, pageSize, class}` and its pager derives the page
              count; this project's takes `{page, pages}` and derives nothing, so the division is
              here. `align` is its own prop rather than a class — see the weekly raffle, which added
              it — so `justify-end` becomes `align="end"`. */}
          <Pagination
            page={page}
            pages={Math.ceil(total / PAGE_SIZE)}
            onChange={setPage}
            align="end"
            loading={detailLoading}
          />
        </div>
      ) : (
        /* `_e` — `center mt-3 min-h-40 w-full rounded-lg bg-layer4`, so the empty state gets the
           card treatment while the populated table gets `my-3` instead. Two different wrappers, not
           one with a conditional child. */
        <div className="center mt-3 min-h-40 w-full rounded-lg bg-layer4">
          <EmptyPlaceholder className="w-full" />
        </div>
      )}
    </DialogShell>
  );
}
