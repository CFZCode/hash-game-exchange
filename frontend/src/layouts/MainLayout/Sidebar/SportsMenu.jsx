import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SportIcon } from '../../../components/exchange/icons';
import Loading from '../../../components/shared/Loading';
import { useSportsTree } from '../../../hooks/exchange';
import { matchPath, sportIconOf } from '../../../pages/Exchange/model';

/* The Sports group's rows: the exchange's own sports tree (`GET all/sports/tree`, one shared 60s
 * poll — hooks/exchange/sharedSportsTree.js) in the sidebar's submenu style. A sport row expands
 * to its competitions, a competition to its matches, and a match is a router <Link> to
 * `/sports/match/:sid/:gmid` — the same route the /sports page opens. This replaced the
 * original's two "Provider Betby" / "Provider BTi" rows (no BetBy or BTi on this platform), and
 * the /sports page's own left column, which drew the same tree from a second read.
 *
 * Mounted only while the group is open, so the tree is read only by a visitor who opens it (or
 * whose route opens it — `/sports` opens the group by default).
 */

const list = (v) => (Array.isArray(v) ? v : []);

export default function SportsMenu({ Arrow, onCloseMobile }) {
  const { pathname } = useLocation();
  const { data, error } = useSportsTree();
  const [open, setOpen] = useState({});
  const toggle = (key) => setOpen((o) => ({ ...o, [key]: !o[key] }));
  const sports = list(data?.sports).filter((s) => list(s.children).length > 0);

  if (data === undefined) {
    return error ? (
      <p className="px-3 py-3 text-center text-xs font-semibold text-tertiary">Sports could not be loaded.</p>
    ) : (
      <div className="center flex h-12">
        <Loading />
      </div>
    );
  }
  if (sports.length === 0) {
    return <p className="px-3 py-3 text-center text-xs font-semibold text-tertiary">No sports right now.</p>;
  }

  return sports.map((sport, si) => {
    const sKey = `s${sport.etid}:${si}`;
    const sOpen = Boolean(open[sKey]);
    const icon = sportIconOf(sport.etid);
    return (
      <div key={sKey}>
        <button
          type="button"
          aria-expanded={sOpen}
          onClick={() => toggle(sKey)}
          className={`nav-link-item relative mt-1 flex h-10 w-full cursor-pointer items-center overflow-hidden rounded-lg px-3 text-left lg:pl-0 lg:pr-2 ${sOpen ? 'text-primary' : ''}`}
        >
          <div className="nav-scale-box center flex flex-none lg:size-10">
            {icon ? (
              <SportIcon sport={icon} className="center size-5 [&_svg]:size-full [&_svg]:fill-current" />
            ) : (
              <span className="size-5" />
            )}
          </div>
          <span className="sidebar-collapse-hide ml-2 truncate whitespace-nowrap text-base font-semibold lg:ml-0 lg:text-sm">
            {sport.name}
          </span>
          <div className="ml-auto mr-0.5 size-4 flex-none">
            <Arrow className={sOpen ? 'rotate-90' : '-rotate-90'} />
          </div>
        </button>
        {sOpen &&
          list(sport.children).map((comp, ci) => {
            /* Indexed: the feed can repeat an id inside one list, and a repeated key drops rows. */
            const cKey = `c${sKey}:${comp.cid}:${ci}`;
            const cOpen = Boolean(open[cKey]);
            return (
              <div key={cKey}>
                <button
                  type="button"
                  aria-expanded={cOpen}
                  onClick={() => toggle(cKey)}
                  className={`nav-link-item relative mt-1 flex h-9 w-full cursor-pointer items-center overflow-hidden rounded-lg pl-11 pr-2 text-left lg:pl-10 ${cOpen ? 'text-primary' : ''}`}
                >
                  <span className="truncate text-sm font-semibold lg:text-xs">{comp.name}</span>
                  <div className="ml-auto mr-0.5 size-4 flex-none">
                    <Arrow className={cOpen ? 'rotate-90' : '-rotate-90'} />
                  </div>
                </button>
                {cOpen &&
                  list(comp.children).map((m, mi) => {
                    const to = matchPath(m.etid ?? sport.etid, m.gmid);
                    const active = pathname === to;
                    return (
                      <Link
                        key={`${m.gmid}:${mi}`}
                        to={to}
                        onClick={onCloseMobile}
                        aria-current={active ? 'page' : undefined}
                        className={`nav-link-item relative mt-1 flex h-8 w-full items-center overflow-hidden rounded-lg pl-14 pr-2 lg:pl-12 ${active ? 'nav-link-active' : ''}`}
                      >
                        <span className="truncate text-sm font-semibold text-secondary lg:text-xs">{m.name}</span>
                      </Link>
                    );
                  })}
              </div>
            );
          })}
      </div>
    );
  });
}
