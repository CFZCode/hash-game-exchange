import React from 'react';
import { Link } from 'react-router-dom';
import GameGrid, { Empty } from './GameGrid';
import Pagination from '../shared/Pagination';
import ProviderLogo from '../shared/ProviderLogo';
import { SportIcon } from '../exchange/icons';
import { SearchIcon, CloseIcon } from './icons';
import { readHistory, remember, writeHistory } from './history';
import { MIN_QUERY, PAGE_SIZE, searchCasino, searchOriginals, searchProviders, searchSports } from './search';
import useResource from '../../hooks/useResource';
import { useGates } from '../../context/gates';

/* The header's search overlay (desktop): a search bar, one tab per kind of result with its
 * count, and the results under them, over the blurred page.
 *
 * This is the site's own design (the owner's reference screenshot), not the original's Explore
 * panel — that one is still `ExplorePanel` in ./index.jsx and is what `/explore` renders on a
 * phone. Every list is read from the platform (./search.js); nothing here is a fixture.
 *
 * Below MIN_QUERY characters nothing is asked and the panel shows the visitor's search history.
 *
 * ONE COMPONENT AT EVERY WIDTH. From `lg` up it is the overlay; below it the same component is
 * the `/explore` page (`page`), where the tabs become one swipeable row instead of seven equal
 * columns, the "at least 3 characters" hint drops under the bar, and the cross clears the text
 * (there is nothing to close: the tabbar is the way out).
 */

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'casino', label: 'Casino', gate: 'casino' },
  { value: 'live', label: 'Live Casino', gate: 'casino' },
  { value: 'sports', label: 'Sports', gate: 'sports' },
  { value: 'esports', label: 'E-Sports', gate: 'sports' },
  { value: 'originals', label: 'Originals', gate: 'originals' },
  { value: 'providers', label: 'Providers', gate: 'casino' },
];

/* How many of each kind the All tab previews before its "View all". */
const PREVIEW = { games: 8, matches: 6, providers: 8 };

const SEARCH_DELAY_MS = 400;
const HISTORY_DELAY_MS = 1500;

const countText = (n) => (n > 999 ? '999+' : String(n));

/* "<page>:<query>" -> that page of the set; nothing for an empty key. */
function readPaged(set, key) {
  if (!key) return null;
  const at = key.indexOf(':');
  return searchCasino(set, key.slice(at + 1), Number(key.slice(0, at)));
}

function MatchList({ items }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
      {items.map((row) => (
        <Link key={row.key} to={row.to} className="search-match flex h-14 items-center gap-3 rounded-xl bg-layer4 px-3">
          <SportIcon sport={row.icon} fallback className="size-6 flex-none items-center justify-center [&_svg]:size-full [&_svg]:fill-current" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-extrabold text-primary">{row.name}</span>
            <span className="block truncate text-xs text-secondary">{[row.sport, row.league].filter(Boolean).join(' · ')}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

function ProviderList({ items }) {
  return (
    <div className="mt-4 grid w-full grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
      {items.map((name) => (
        <Link
          key={name}
          to={`/provider/${encodeURIComponent(name)}`}
          className="button h-14 overflow-hidden sm:h-16 rounded-xl bg-layer4 p-0 text-center font-extrabold text-secondary"
        >
          <ProviderLogo name={name} />
        </Link>
      ))}
    </div>
  );
}

function Section({ title, total, onViewAll, children }) {
  return (
    <section className="mt-5 first:mt-0 sm:mt-6">
      <div className="flex items-center">
        <h3 className="text-base font-extrabold text-primary">{title}</h3>
        <span className="ml-2 text-sm text-secondary">{total}</span>
        {onViewAll && (
          <button type="button" className="ml-auto text-sm font-semibold text-secondary hover:text-brand" onClick={onViewAll}>
            View all
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function History({ history, setHistory, onPick }) {
  const clear = () => {
    setHistory([]);
    writeHistory([]);
  };
  const remove = (value) => {
    const next = history.filter((item) => item !== value);
    setHistory(next);
    writeHistory(next);
  };
  return (
    <>
      <div className="flex h-11 items-center rounded-xl bg-layer4 px-4 sm:px-5">
        <span className="text-sm font-extrabold text-primary">Search History</span>
        {history.length > 0 && (
          <button type="button" className="ml-auto text-xs font-semibold text-secondary hover:text-brand" onClick={clear}>
            Clear All
          </button>
        )}
      </div>
      {history.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 px-1 sm:mt-4">
          {history.map((item) => (
            <span key={item} className="flex h-8 max-w-full items-center gap-1 rounded-full bg-layer5 pl-3 pr-2">
              <button type="button" className="min-w-0 truncate text-sm text-secondary hover:text-primary" onClick={() => onPick(item)}>
                {item}
              </button>
              <button type="button" aria-label={`Remove ${item}`} className="flex size-5 flex-none items-center justify-center" onClick={() => remove(item)}>
                <CloseIcon className="size-3 fill-secondary hover:fill-brand" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 px-1 text-sm text-secondary sm:mt-4">Your recent searches will show here.</p>
      )}
    </>
  );
}

export default function SearchOverlay({ onClose, page = false, autoFocus = true, initialTab = 'all' }) {
  const gates = useGates();
  const tabs = TABS.filter((tab) => !tab.gate || gates.on(tab.gate));
  const shown = (value) => tabs.some((tab) => tab.value === value);

  const [input, setInput] = React.useState('');
  const [query, setQuery] = React.useState(''); // the debounced, trimmed text the reads use
  const [picked, setTab] = React.useState(initialTab);
  const [pages, setPages] = React.useState({ casino: 1, live: 1 });
  const [history, setHistory] = React.useState(() => readHistory());
  const tab = shown(picked) ? picked : 'all';

  /* Typing settles for a moment before anything is asked; a term stays in the history only once
     the visitor has stopped on it. */
  React.useEffect(() => {
    const value = input.trim();
    const ask = setTimeout(() => {
      setQuery(value);
      setPages({ casino: 1, live: 1 });
    }, SEARCH_DELAY_MS);
    const keep = value.length >= MIN_QUERY ? setTimeout(() => setHistory(remember(value)), HISTORY_DELAY_MS) : null;
    return () => {
      clearTimeout(ask);
      clearTimeout(keep);
    };
  }, [input]);

  const active = query.length >= MIN_QUERY;
  const q = active ? query : '';
  const casinoOn = shown('casino');
  const sportsOn = shown('sports');
  const originalsOn = shown('originals');

  /* Each read is keyed on a string, so it is asked again only when what it asks for changes. */
  const casinoKey = q && casinoOn ? `${pages.casino}:${q}` : '';
  const liveKey = q && casinoOn ? `${pages.live}:${q}` : '';
  const originalsKey = originalsOn ? q : '';
  const providersKey = casinoOn ? q : '';
  const sportsKey = sportsOn ? q : '';
  const readCasino = React.useCallback(() => readPaged('all', casinoKey), [casinoKey]);
  const readLive = React.useCallback(() => readPaged('live', liveKey), [liveKey]);
  const readOriginals = React.useCallback(() => (originalsKey ? searchOriginals(originalsKey) : null), [originalsKey]);
  const readProviders = React.useCallback(() => (providersKey ? searchProviders(providersKey) : null), [providersKey]);
  const readSports = React.useCallback(() => (sportsKey ? searchSports(sportsKey) : null), [sportsKey]);

  const casino = useResource(readCasino);
  const live = useResource(readLive);
  const originals = useResource(readOriginals);
  const providers = useResource(readProviders);
  const sportsRead = useResource(readSports);

  const none = { items: [], total: 0 };
  const result = {
    casino: casino.data ?? none,
    live: live.data ?? none,
    sports: sportsRead.data?.sports ?? none,
    esports: sportsRead.data?.esports ?? none,
    originals: originals.data ?? none,
    providers: providers.data ?? none,
  };
  const loading = {
    casino: casino.loading,
    live: live.loading,
    sports: sportsRead.loading,
    esports: sportsRead.loading,
    originals: originals.loading,
    providers: providers.loading,
  };
  const kinds = tabs.filter((t) => t.value !== 'all').map((t) => t.value);
  const anyLoading = active && kinds.some((kind) => loading[kind]);
  const totalFound = kinds.reduce((sum, kind) => sum + result[kind].total, 0);

  const pick = (value) => {
    setInput(value);
    setQuery(value.trim());
    setPages({ casino: 1, live: 1 });
  };

  /* One kind's full list (its own tab), or its first few (the All tab). */
  const body = (kind, preview = false) => {
    const { items, total } = result[kind];
    if (kind === 'sports' || kind === 'esports') {
      return <MatchList items={preview ? items.slice(0, PREVIEW.matches) : items} />;
    }
    if (kind === 'providers') {
      return <ProviderList items={preview ? items.slice(0, PREVIEW.providers) : items} />;
    }
    const paged = !preview && (kind === 'casino' || kind === 'live');
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    return (
      <>
        <GameGrid games={preview ? items.slice(0, PREVIEW.games) : items} loading={loading[kind]} />
        {paged && pageCount > 1 && (
          <Pagination page={Math.min(pages[kind], pageCount)} pages={pageCount} onChange={(page) => setPages((prev) => ({ ...prev, [kind]: page }))} />
        )}
      </>
    );
  };

  let panel;
  if (!active) {
    panel = <History history={history} setHistory={setHistory} onPick={pick} />;
  } else if (tab === 'all') {
    const filled = kinds.filter((kind) => result[kind].total > 0);
    if (filled.length) {
      panel = filled.map((kind) => (
        <Section
          key={kind}
          title={tabs.find((t) => t.value === kind).label}
          total={countText(result[kind].total)}
          onViewAll={() => setTab(kind)}
        >
          {body(kind, true)}
        </Section>
      ));
    } else {
      panel = anyLoading ? <GameGrid games={[]} loading /> : <Empty>No results for &ldquo;{query}&rdquo;</Empty>;
    }
  } else if (result[tab].total > 0 || loading[tab]) {
    panel = loading[tab] && !result[tab].items.length ? <GameGrid games={[]} loading /> : body(tab);
  } else {
    panel = <Empty>No results for &ldquo;{query}&rdquo;</Empty>;
  }

  const short = input.trim().length < MIN_QUERY;
  const hint = `Search requires at least ${MIN_QUERY} characters`;

  return (
    <div className={`search-overlay w-full ${page ? '' : 'mx-auto max-w-[1412px] px-3 pb-6 pt-1.5 sm:px-4'}`}>
      <div className="search-overlay-bar flex h-12 items-center rounded-2xl bg-layer3 pl-3 pr-2 sm:h-14 sm:pl-4 sm:pr-2.5">
        <SearchIcon className="size-6 flex-none fill-secondary sm:size-7" />
        <input
          type="text"
          className="ml-2 h-full min-w-0 flex-1 bg-transparent text-base font-semibold text-primary outline-none placeholder:text-secondary"
          placeholder="What are you looking for?"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          enterKeyHint="search"
          autoFocus={autoFocus}
        />
        {short && <span className="mx-4 hidden flex-none text-sm font-semibold text-secondary md:block">{hint}</span>}
        {/* The overlay's cross closes it; the page's clears the text, and is not drawn on an empty box. */}
        {(!page || input) && (
          <button
            type="button"
            aria-label={page ? 'Clear search' : 'Close search'}
            className="flex size-8 flex-none items-center justify-center rounded-full bg-layer5 hover:bg-layer6 sm:size-9"
            onClick={page ? () => pick('') : onClose}
          >
            <CloseIcon className="size-4 fill-primary sm:size-5" />
          </button>
        )}
      </div>
      {short && <p className="mt-2 px-1 text-xs font-semibold text-secondary md:hidden">{hint}</p>}

      {/* One swipeable row below `lg`; seven equal columns from there up. */}
      <div className="search-overlay-tabs hidden-scroll-bar mt-3 flex gap-2 overflow-x-auto sm:mt-4 lg:grid lg:grid-flow-col lg:gap-3 lg:overflow-visible lg:[grid-auto-columns:minmax(0,1fr)]">
        {tabs.map(({ value, label }) => {
          const selected = value === tab;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              className={`search-overlay-tab flex h-11 flex-none items-center rounded-full bg-layer3 lg:h-[3.625rem] lg:px-3 ${value === 'all' ? 'justify-center px-6' : 'pl-2 pr-4'} ${selected ? 'is-active' : ''}`}
              onClick={() => setTab(value)}
            >
              {value !== 'all' && (
                <span className="search-overlay-count flex h-7 min-w-7 flex-none items-center justify-center rounded-full bg-layer1 px-2 text-xs font-extrabold text-primary lg:h-9 lg:min-w-9">
                  {active ? countText(result[value].total) : 0}
                </span>
              )}
              <span className={`truncate text-sm font-extrabold text-primary ${value === 'all' ? '' : 'ml-2 lg:ml-4'}`}>{label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-2xl bg-layer3 p-3 sm:mt-4 sm:rounded-3xl sm:p-5" aria-busy={anyLoading} data-found={active ? totalFound : undefined}>
        {panel}
      </div>
    </div>
  );
}
