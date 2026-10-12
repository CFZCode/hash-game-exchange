import React from 'react';
import Pagination from '../../components/shared/Pagination';
import { Empty } from '../../components/Explore/GameGrid';
import { getPromotions } from '../../services/promotions';
import { useResource } from '../../hooks/useResource';
import { useIsDialog } from '../../context/dialogRoute';
import Skeleton from '../../components/shared/Skeleton';
import * as globMaps from './index.globs.js';

/* The promotions page — `/promotions/promotion`.
 *
 * That path is the original's own (`Enter-MsmOuq5R.js`, and the footer already links to it).
 * The route also carries a family of siblings there — `/promotions/daily-contest`,
 * `/promotions/weekly-raffle`, `/promotions/exclusive-promo`, `/promotion/:id` — which are the
 * individual promotion pages behind each card. None of those are built; the cards are inert.
 *
 * Transcribed from the live page's rendered markup, so the class lists below are the site's,
 * not a reconstruction. Three things in them are worth not "tidying":
 *
 * - `bonus-scope` appears TWICE, on the outer wrapper and again on the inner one. That is the
 *   original's own duplication, and it is not decorative: `.app-root.dark .bonus-scope` in
 *   index-DxOqNczA.css re-declares a handful of tokens, which is where `fourth`, `quinary` and
 *   `card_dark` come from (all four now in the @theme block).
 * - `@container` is Tailwind's container-query marker. Nothing in the captured markup actually
 *   uses a `@`-prefixed variant, so it does nothing here — kept because it is in the DOM.
 * - The card's meta group carries `-ml-2` and the artwork `-mr-1.5`. Both are the original's;
 *   they pull those blocks past the card's own padding.
 *
 * ARTWORK. All eleven images are local now, downloaded from the CDN the page serves them from
 * (`imgxcut.com/bc_event/<hash>.png?_v=4,dpr=1.25,width=800` — the 800px variant, so the 112px
 * slot has retina headroom). They keep the CDN's own hash as their filename, which is what lets
 * `promotions.js` name them without a second lookup table: the fixture's `image` field IS the
 * basename.
 *
 * The miss branch in `artFor` stays even though nothing hits it today — a promotion added
 * before its art is fetched should render an empty 112px slot rather than a broken image, and
 * the slot keeps its size so the text column and card height stay honest either way.
 */
const art = globMaps.art;

const artFor = (name) =>
  art[`../../assets/promotions/${name}.png`] ||
  art[`../../assets/promotions/${name}.avif`] ||
  art[`../../assets/promotions/${name}.jpg`];

/* Both paths are the site's own, straight out of the captured markup. The chevron is the same
   one Pagination draws — the original ships a single left-pointing arrow everywhere and rotates
   it, which is also how it gets RTL right. */
const ClockIcon = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <path d="M16 4C22.6274 4 28 9.37257 28 16C28 22.6274 22.6274 28 16 28C9.37257 28 4 22.6274 4 16C4 9.37257 9.37257 4 16 4ZM16 6.57143C10.7929 6.57143 6.57143 10.7929 6.57143 16C6.57143 21.2071 10.7929 25.4286 16 25.4286C21.2071 25.4286 25.4286 21.2071 25.4286 16C25.4286 10.7929 21.2071 6.57143 16 6.57143ZM15.1429 9.256C15.9297 9.256 16.5751 9.862 16.6377 10.6326L16.6429 10.756V16.4637L20.7503 16.4646C21.5783 16.4646 22.2503 17.1366 22.2503 17.9646C22.2503 18.7514 21.6443 19.3969 20.8737 19.4594L20.7503 19.4646H15.1429C15.0246 19.4646 14.9089 19.4509 14.7983 19.4251C14.6963 19.3977 14.6731 19.39 14.6517 19.3831C14.596 19.3626 14.5686 19.3514 14.542 19.3403C14.476 19.3094 14.458 19.3009 14.4409 19.2914C14.3629 19.2477 14.35 19.2391 14.3363 19.2306C14.2711 19.186 14.2506 19.1714 14.2309 19.156C14.176 19.1131 14.1614 19.1003 14.146 19.0866C14.0886 19.0326 14.0749 19.0189 14.062 19.0051C14.0054 18.9426 13.996 18.9314 13.9866 18.9203C13.9334 18.8526 13.9206 18.8346 13.9069 18.8157C13.8666 18.7549 13.8563 18.7377 13.846 18.7214C13.8066 18.6494 13.7971 18.6297 13.7877 18.61C13.7577 18.5431 13.7509 18.5277 13.7449 18.5114C13.7226 18.454 13.7037 18.3949 13.6883 18.3349C13.6583 18.2166 13.6429 18.0931 13.6429 17.9654V10.7569C13.6429 9.92886 14.3149 9.25686 15.1429 9.25686V9.256Z" />
  </svg>
);

const ChevronIcon = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <path d="M19.6912 5.6L9.2912 16L19.6912 26.4L22.7088 23.3824L15.3264 16L22.7088 8.6176L19.6912 5.6Z" />
  </svg>
);

/* Exported for ./Archived.jsx, which renders the identical card — `le`, the list, is one
   component on the original and the archived popup passes it `inProgress: false`. */
export function PromotionCard({ promo }) {
  const image = artFor(promo.image);

  return (
    <article className="relative flex h-44 w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-fourth/10 bg-alw_white pb-2 pl-5 pr-4 pt-5 sm:rounded-2xl dark:bg-card_dark">
      <div className="flex items-start justify-between gap-3">
        <div className="w-56 min-w-0 flex-1">
          {/* Absolutely positioned against the CARD, not this column — it tucks into the card's
              top-left corner, which is why it is `rounded-b-md rounded-l-none`. */}
          {promo.tag && (
            <div className="absolute left-0 top-0 flex h-[22px] items-center rounded-b-md rounded-l-none bg-white_alpha5 px-1.5 pl-3 pr-2 text-[10px] font-semibold uppercase text-secondary">
              {promo.tag}
            </div>
          )}
          <div className="line-clamp-1 pt-1 text-2xl font-extrabold leading-7 text-brand">
            {promo.headline}
          </div>
          <div className="line-clamp-1 pt-1.5 text-sm font-extrabold uppercase leading-5 text-secondary">
            {promo.title}
          </div>
          {/* `font-normal`, and this is a DELIBERATE DEPARTURE — the captured markup says
              `font-semibold`. Changed at request because the description reads too heavy here.
              Worth knowing why it can differ at all: this build ships Averta at 400/600/800
              only, so a weight the original has that we do not gets synthesised by the browser
              rather than swapped for a real face, and semibold body copy at 12px sits heavier
              than it does on the live page. Restore `font-semibold` if the goal returns to
              matching the capture exactly. */}
          <div className="mt-1 line-clamp-2 text-xs font-semibold leading-4 text-quinary">
            {promo.description}
          </div>
        </div>

        <div className="-mr-1.5 h-28 w-28 shrink-0 overflow-hidden rounded-lg px-1.5 pb-3">
          {image && <img className="block w-full" alt="" src={image} />}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-fourth/5 pb-1 pt-3">
        <div className="-ml-2 flex items-center gap-2">
          <div className="flex items-center gap-1 text-xxs font-normal text-quinary">
            <ClockIcon className="icon size-3.5 fill-quinary" />
            <span>Ends</span>
            <span>{promo.endsLabel}</span>
          </div>
          <div className="h-1 w-9 overflow-hidden rounded-full bg-layer3_alt">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${promo.progress}%` }}
            />
          </div>
        </div>

        <ChevronIcon className="icon size-4 rotate-180 fill-secondary" />
      </div>
    </article>
  );
}

export default function Promotions() {
  /* False on a page, true when ./Dialog.jsx has mounted this same component as the phone's
     full-screen dialog — the router's own context, not a prop. See context/dialogRoute.js. */
  const isDialog = useIsDialog();
  const [tab, setTab] = React.useState('all');
  const [page, setPage] = React.useState(1);

  /* `env` is the REQUEST's own field and the phone's answer carries one tab fewer — see the note
     on `TABS_H5`. `isDialog` is the device here for the reason it is everywhere else in this
     page: below `lg` this component is mounted as the full-screen dialog and nowhere else, so the
     two tests cannot disagree. */
  const read = React.useCallback(
    () => getPromotions({ page, tab, env: isDialog ? 'H5' : 'WEB' }),
    [page, tab, isDialog],
  );
  const { data, loading } = useResource(read);

  const tabs = data?.tabs ?? [];
  const promotions = data?.promotions ?? [];
  const pageSize = data?.pageSize ?? 0;
  const total = data?.total ?? 0;
  const pages = pageSize ? Math.ceil(total / pageSize) : 1;

  /* The indicator is MEASURED, not computed from a tab count. These tabs are `max-w-fit` with a
     `gap-8` between them, so each one is as wide as its own label — the capture has
     `--tabs-width: 17px` for "All". (The auth dialog's tabs share the same CSS but divide the
     strip evenly, so it can set both vars from an index; this one cannot.)

     Written straight onto the node rather than held in state on purpose: measuring in a layout
     effect and calling setState is a cascading render, which `react-hooks/set-state-in-effect`
     rejects. Touching the DOM node in an effect is exactly what effects are for. */
  const listRef = React.useRef(null);
  React.useLayoutEffect(() => {
    const list = listRef.current;
    const group = list?.querySelector('.tabs-btn-group');
    const active = group?.querySelector('[aria-selected="true"]');
    if (!list || !group || !active) return;

    list.style.setProperty('--tabs-width', `${active.getBoundingClientRect().width}px`);
    list.style.setProperty(
      '--tabs-indicator-position',
      `${active.getBoundingClientRect().left - group.getBoundingClientRect().left}px`
    );
    /* `tabs.length`, not `tabs`: the list comes from `data?.tabs ?? []`, so the fallback is a
       fresh array on every render and depending on it would re-measure forever. The count is
       what actually matters — the buttons only move when one is added or removed. */
  }, [tab, tabs.length]);

  const selectTab = (id) => {
    setTab(id);
    setPage(1);
  };

  return (
    /* `px-4 sm:px-0` is the page's own mobile gutter, and it is the original's own pattern —
       the VIP page root carries exactly this pair. `.main-layout-content` runs
       `padding-inline: 0` below 640 by design (see MainLayout.css: each page supplies its own
       inset there, because the home hero has to go full-bleed) and only picks the 16px up at
       sm. Without it this page ran edge-to-edge on a phone. */
    <div className="bonus-scope @container px-4 sm:px-0">
      <div className="pb-4 pt-4 sm:pt-4">
        {/* THE HEADING AND THE DIALOG'S TITLE BAR ARE THE SAME STRING AND ONLY ONE RENDERS.
            Below `lg` this page is mounted as a full-screen dialog (`info.dialog = m.mobile`; see
            ./Dialog.jsx) and "Promotion" is already printed in the bar, so drawing it again here
            would put it twice on the screen. On the original neither element is conditional —
            `PageLayout` receives one `title` and `w3` decides which of the two it becomes. */}
        {!isDialog && (
          <header className="mb-4 text-base font-extrabold text-primary lg:text-lg">Promotion</header>
        )}

        <div className="bonus-scope relative sm:pb-10">
          <div
            ref={listRef}
            role="tablist"
            data-type="indicator"
            className="scroll-x tabs-title hide-scroll h-11 rounded-none border-b border-fourth/5 !bg-transparent [&_.tabs-btn-group]:gap-8 [&_.tabs-btn]:max-w-fit [&_.tabs-btn]:!bg-transparent [&_.tabs-btn]:px-0 [&_.tabs-indicator]:bg-secondary"
          >
            <div className="tabs-btn-group">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  {...(t.id === tab ? { 'aria-selected': 'true' } : {})}
                  className="tabs-btn btn-like"
                  onClick={() => selectTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="tabs-indicator test-indicator-tab" />
          </div>

          <div className="tabs-content !bg-transparent">
            {/* THE TAB STRIP IS THE FEED'S TOO — `categoryList` comes back in the same response —
                so while this is out the strip above is empty as well and there is nothing on the
                pane to anchor a per-card placeholder to. Skeletons at the card grid's own shape
                instead: three columns from `lg`, one card's height, so the pager below lands
                where it will land. A card is `h-28` artwork over its copy; `h-44` is the settled
                card measured off the capture. */}
            {loading ? (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:gap-x-4 sm:gap-y-8 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }, (unused, i) => (
                  <Skeleton key={`skeleton-${i}`} className="block h-44 rounded-xl" radius={0}>
                    <div className="size-full" />
                  </Skeleton>
                ))}
              </div>
            ) : promotions.length ? (
              <>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:gap-x-4 sm:gap-y-8 md:grid-cols-2 lg:grid-cols-3">
                  {promotions.map((promo) => (
                    <PromotionCard key={promo.id} promo={promo} />
                  ))}
                </div>

                {/* The site's own pager, markup and all — the captured DOM here is exactly
                    `components/shared/Pagination`, down to the editable page field.

                    `pt-4`, and this is a DELIBERATE DEPARTURE from the capture, which has
                    `pt-8`. The grid above already ends on `sm:gap-y-8`, so the captured pair
                    stacks 32px of row gap under 32px of pager padding and the pager drifts a
                    long way from the last row. Halved at request; restore `pt-8` if the goal
                    ever goes back to matching the capture exactly here. */}
                <div className="flex justify-center pt-4">
                  <Pagination page={page} pages={pages} onChange={setPage} loading={loading} />
                </div>
              </>
            ) : (
              /* Reachable only on a later page of a tab that has fewer promotions than a full
                 page — every tab has at least one on page 1. Kept because the pager can still
                 put you there, and because the site's own empty state is what belongs here. */
              <Empty />
            )}
          </div>

          <div className="absolute right-0 top-1 flex justify-center">
            <button
              className="button button-input button-s border border-third bg-transparent px-2 text-sm text-secondary"
              type="button"
            >
              Archived
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
