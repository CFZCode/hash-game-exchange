import { useNavigate, useSearchParams } from 'react-router-dom';
import { SportTabs, LatestEventsStrip, InPlayList } from '../../../components/exchange';
import Loading from '../../../components/shared/Loading';
import { useSportsList, useLatestEvents } from '../../../hooks/exchange';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import ExchangeFrame from '../ExchangeFrame';
import SportsTree from './SportsTree';
import { LOBBY_SPORTS, INPLAY_TAB, matchPath, sportIconOf, splitBoard } from '../model';

/* In-Play first (BetBy's own order puts Live ahead of the sports), then the three boards. The
   In-Play pill has no glyph: SportTabs draws sport art only, and the asset set has no "live"
   sport — BetBy's live mark is chrome (`ic-live`), which the row's own in-play mark already uses. */
const TABS = [{ id: INPLAY_TAB, label: 'In-Play' }, ...LOBBY_SPORTS];
const DEFAULT_TAB = 'cricket';

/* The muted box InPlayList itself draws for an empty list, reused for the two states it has no
   arm for (first read in flight, read failed). */
const Notice = ({ children }) => (
  <div className="flex min-h-24 items-center justify-center rounded-xl bg-layer3 px-4 py-8 text-center text-sm text-tertiary">
    {children}
  </div>
);

/**
 * `/sports` — the exchange lobby. Sport pills (In-Play / Cricket / Football / Tennis, kept in
 * `?sport=` so Back returns to the same board), the latest-events strip, and the board grouped by
 * competition from `useSportsList(sid)` (5s). Desktop adds the sports tree on the left.
 *
 * A row opens `/sports/match/:sid/:gmid`; a price opens the same page with
 * `?market=<mid>&runner=<section sid>&side=back|lay` so the match page can preselect it.
 */
export default function ExchangeLobby() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  const asked = params.get('sport');
  const tab = TABS.some((t) => t.id === asked) ? asked : DEFAULT_TAB;
  const setTab = (id) => setParams(id === DEFAULT_TAB ? {} : { sport: id }, { replace: true });
  const all = tab === INPLAY_TAB;

  /* One poll per board, and only the boards on screen: the In-Play view needs all three, a sport
     view only its own (a null sid disables the hook). Three explicit calls — hooks cannot sit in
     a loop. */
  const cricket = useSportsList(all || tab === 'cricket' ? 4 : null);
  const soccer = useSportsList(all || tab === 'soccer' ? 1 : null);
  const tennis = useSportsList(all || tab === 'tennis' ? 2 : null);
  const boards = { cricket, soccer, tennis };

  const views = LOBBY_SPORTS.map((s) => ({ ...s, board: boards[s.id], rows: splitBoard(boards[s.id].data?.events, s.sid) }));
  const byId = new Map();
  for (const v of views) for (const m of [...v.rows.live, ...v.rows.upcoming]) byId.set(m.id, m);

  const linkFor = (m) => matchPath(m.sid, m.gmid);
  const onSelect = (sel) => {
    const m = byId.get(String(sel.matchId));
    if (!m) return;
    navigate(matchPath(m.sid, m.gmid, { market: m.marketId, runner: m.runners[sel.outcome], side: sel.side }));
  };

  const { data: latest } = useLatestEvents();
  const latestEvents = (Array.isArray(latest) ? latest : []).slice(0, 20).map((e) => ({
    id: String(e.id),
    name: e.name,
    sportId: e.sportId,
    sport: sportIconOf(e.sportId),
    inPlay: Boolean(byId.get(String(e.id))?.inPlay),
  }));

  const listProps = { linkFor, onSelect };

  let body;
  if (all) {
    const pending = views.filter((v) => v.board.data === undefined);
    const live = views.flatMap((v) => v.rows.live);
    body =
      live.length === 0 && pending.length > 0 ? (
        pending.every((v) => v.board.error) ? (
          <Notice>Matches could not be loaded. Retrying…</Notice>
        ) : (
          <Notice>
            <Loading />
          </Notice>
        )
      ) : (
        <InPlayList
          title="In-Play"
          matches={live}
          empty={<Notice>No matches are in play right now.</Notice>}
          {...listProps}
        />
      );
  } else {
    const view = views.find((v) => v.id === tab);
    const { live, upcoming } = view.rows;
    body =
      view.board.data === undefined ? (
        <Notice>{view.board.error ? 'Matches could not be loaded. Retrying…' : <Loading />}</Notice>
      ) : live.length + upcoming.length === 0 ? (
        <Notice>No {view.label.toLowerCase()} matches right now.</Notice>
      ) : (
        <>
          {live.length > 0 && <InPlayList title="In-Play" matches={live} {...listProps} />}
          {upcoming.length > 0 && <InPlayList title="Upcoming" matches={upcoming} {...listProps} />}
        </>
      );
  }

  return (
    <ExchangeFrame>
      <div className="mt-4 flex gap-4">
        {isDesktop && <SportsTree activeSid={LOBBY_SPORTS.find((s) => s.id === tab)?.sid ?? 4} />}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <LatestEventsStrip events={latestEvents} linkFor={(e) => matchPath(e.sportId, e.id)} />
          <SportTabs sports={TABS} active={tab} onChange={setTab} />
          {body}
        </div>
      </div>
    </ExchangeFrame>
  );
}
