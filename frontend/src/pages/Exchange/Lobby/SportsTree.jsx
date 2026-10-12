import React from 'react';
import { Link } from 'react-router-dom';
import { SportIcon, IconArrow } from '../../../components/exchange/icons';
import Loading from '../../../components/shared/Loading';
import { useSportsTree } from '../../../hooks/exchange';
import { matchPath, sportIconOf } from '../model';

const list = (v) => (Array.isArray(v) ? v : []);

/* Disclosure state: a key is open when toggled open, or — never toggled — when it is the sport
   the lobby is showing. Derived during render (no effect copying `activeSid` into state). */
function useDisclosure(defaultOpenKey) {
  const [toggled, setToggled] = React.useState({});
  const isOpen = (key) => (key in toggled ? toggled[key] : key === defaultOpenKey);
  const toggle = (key) => setToggled((t) => ({ ...t, [key]: !isOpen(key) }));
  return [isOpen, toggle];
}

const Chevron = ({ open }) => (
  <IconArrow className={`ml-auto size-4 flex-none fill-tertiary transition-transform ${open ? '-rotate-90' : 'rotate-180'}`} />
);

/**
 * The desktop lobby's left column: every sport in `GET all/sports/tree` (60s) → competitions →
 * matches, each match a <Link> to its match page. The surface and rows are MenuPageLayout's
 * account rail (`rounded-xl bg-layer4 p-2`, 40px `btn-like` rows), the site's own left menu.
 */
export default function SportsTree({ activeSid }) {
  const { data, error } = useSportsTree();
  const [isOpen, toggle] = useDisclosure(`s${activeSid}`);
  const sports = list(data?.sports).filter((s) => list(s.children).length > 0);

  return (
    <nav
      aria-label="Sports"
      className="hide-scroll sticky top-19 max-h-[calc(100vh-5.75rem)] w-60 flex-none self-start overflow-y-auto rounded-xl bg-layer4 p-2 text-sm text-secondary"
    >
      {data === undefined ? (
        error ? (
          <p className="px-3 py-6 text-center text-xs text-tertiary">Sports could not be loaded.</p>
        ) : (
          <div className="flex h-24 items-center justify-center">
            <Loading />
          </div>
        )
      ) : sports.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-tertiary">No sports right now.</p>
      ) : (
        sports.map((sport) => {
          const sKey = `s${sport.etid}`;
          const open = isOpen(sKey);
          const icon = sportIconOf(sport.etid);
          return (
            <div key={sKey}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => toggle(sKey)}
                className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left ${
                  open ? 'font-extrabold text-primary' : 'btn-like font-semibold'
                }`}
              >
                {icon ? (
                  <SportIcon sport={icon} className="size-5 flex-none [&_svg]:size-full [&_svg]:fill-current" />
                ) : (
                  <span className="size-5 flex-none" />
                )}
                <span className="truncate">{sport.name}</span>
                <Chevron open={open} />
              </button>
              {open &&
                list(sport.children).map((comp) => {
                  const cKey = `c${sport.etid}:${comp.cid}`;
                  const cOpen = isOpen(cKey);
                  return (
                    <div key={cKey}>
                      <button
                        type="button"
                        aria-expanded={cOpen}
                        onClick={() => toggle(cKey)}
                        className={`flex h-9 w-full items-center gap-2 rounded-lg pl-10 pr-3 text-left text-xs btn-like ${
                          cOpen ? 'text-primary' : ''
                        }`}
                      >
                        <span className="truncate font-semibold">{comp.name}</span>
                        <Chevron open={cOpen} />
                      </button>
                      {cOpen &&
                        list(comp.children).map((m) => (
                          <Link
                            key={m.gmid}
                            to={matchPath(m.etid ?? sport.etid, m.gmid)}
                            className="flex h-8 items-center rounded-lg pl-12 pr-3 text-xs text-tertiary hover:bg-layer5 hover:text-primary"
                          >
                            <span className="truncate">{m.name}</span>
                          </Link>
                        ))}
                    </div>
                  );
                })}
            </div>
          );
        })
      )}
    </nav>
  );
}
