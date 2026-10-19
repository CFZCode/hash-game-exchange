import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import GameTile from '../../components/shared/GameTile';
import Loading from '../../components/shared/Loading';
import EmptyPlaceholder from '../../components/shared/EmptyPlaceholder';
import { Accordion, AccordionItem } from '../../components/shared/Accordion';
import { IconArrow } from '../../components/shared/icons';
import { useIsDialog } from '../../context/dialogRoute';
import usePromotion from './usePromotion';
import sanitizeHtml from '../../utils/sanitizeHtml';
import { useSelectedCurrency } from '../../hooks/useSelectedCurrency';
import { rupeesIn } from '../../utils/currency';
import * as promotionArt from '../Promotions/index.globs.js';
import './PromotionDetail.css';

/* ONE PROMOTION — `/promotion/:segment/:slug`, built on request (2026-10-16).
 *
 * THE MARKUP IS THE ORIGINAL'S. bc.game's `/promotion/:id` loads `detail-Bn5sXbpM.js` (route ->
 * `L.PromotionDetail` -> registry `wa` -> import, the two hops in `Enter-MsmOuq5R.js`; the chunk is
 * not in the mirror and came off `hash.game/assets/`). Its templates are transcribed below with
 * their class lists intact, the dead `text-20px` included (no rule anywhere in the deploy's CSS).
 * The route there carries `info: { dialog: m.mobile, keepAlive: false }` — a page on a desktop and
 * the full-screen sheet below `lg`, which is ./Dialog.jsx.
 *
 * THE DATA IS THE PLATFORM'S, so a few arms are this build's rather than the chunk's:
 *
 * - The path carries the SEGMENT as well as the slug: the platform's slug is unique per segment.
 * - The original's `eventBgImg`/`eventDarkImg` pair is one `imageUrl` here (both themes).
 * - The countdown sits inside the artwork block on the original and so vanishes with the artwork;
 *   here the block renders for the countdown alone when a promotion has no image.
 * - `liveStartTime` has no counterpart (no "Coming Soon" arm): a promotion with no `endsAt` is the
 *   original's `isPermanent` and draws no countdown; `promoStatus: ended` or a past `endsAt` is
 *   "Event Ended".
 * - `subTitle` <- `summary`; "Total Prize:" <- `tournamentPanel.prizePool` as written.
 * - The CTA is `btnOneText`/`btnOneLink` on the original. Here a casino promotion says "Play now"
 *   and opens its first qualifying game (else `viewAllHref`, else `/casino`); a sports one says
 *   "Bet now" and opens its first event (else `viewAllHref`, else `/sports`).
 * - Terms & Conditions sit in the shared Accordion (on request); the original prints them inline
 *   under the description in the same `promotion-richStyle` block, which is kept inside the row.
 * - Sports: the original mounts BetBy's widget for `sportLiveCategory`; this build has no BetBy,
 *   so `sportEvents` render as a list of cards in the page's own tokens.
 * - Not found answers the site's empty state; the original navigates to `/`.
 * - `leaderboard` is not drawn yet.
 *
 * Operator HTML goes through utils/sanitizeHtml before it reaches the DOM. */

/* The list's artwork map (pages/Promotions, generated from `assets/promotions/`), so a fixture
   promotion draws the same local art its card does; a live one carries `imageUrl`. */
const artFor = (name) =>
  promotionArt.art[`../../assets/promotions/${name}.png`] ||
  promotionArt.art[`../../assets/promotions/${name}.avif`] ||
  promotionArt.art[`../../assets/promotions/${name}.jpg`];

/* `Ze` in the chunk's fallback — the site's spinner, centred in an `h-40` box. */
function PendingBox() {
  return (
    <div className="flex h-40 items-center justify-center">
      <Loading />
    </div>
  );
}

const DAY = 86400000;

/* The original's `Ee(() => liveEndTime)` is a ticking countdown signal; this is the same one-second
   clock, running only while there is something to count down to. */
function useNow(active) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function statusOf(promo, now) {
  const end = promo.endsAt ? new Date(promo.endsAt).getTime() : null;
  if (promo.promoStatus === 'ended' || (end !== null && end <= now)) return { ended: true, permanent: false };
  if (end === null || Number.isNaN(end)) return { ended: false, permanent: true };
  const left = end - now;
  return {
    ended: false,
    permanent: false,
    countdown: {
      days: Math.floor(left / DAY),
      hours: Math.floor((left % DAY) / 3600000),
      minutes: Math.floor((left % 3600000) / 60000),
      seconds: Math.floor((left % 60000) / 1000),
    },
  };
}

const endsText = (instant) =>
  new Date(instant).toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }) + ' UTC';

const isExternal = (href) => /^(?:[a-z]+:)?\/\//i.test(href ?? '');

/* An internal destination is a `<Link>` (CLAUDE.md); an absolute URL is an anchor in a new tab,
   which is what the original's `/http/.test(link) ? window.open(link) : navigate(link)` does. */
function SmartLink({ href, className, children }) {
  if (isExternal(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}

/* `vr` — the four-box clock, verbatim. */
function Countdown({ countdown }) {
  const cells = [
    [countdown.days, 'Day'],
    [countdown.hours, 'Hour'],
    [countdown.minutes, 'Min'],
    [countdown.seconds, 'Sec'],
  ];
  return (
    <div className="flex items-center">
      <span className="mr-1 pr-6 text-sm text-tertiary">Ends In:</span>
      <span className="flex gap-2">
        {cells.map(([value, unit]) => (
          <div
            key={unit}
            className="flex size-12 flex-col items-center justify-center rounded-md bg-layer4 text-base font-extrabold"
          >
            {value || 0}
            <div className="text-xs font-normal text-tertiary">{unit}</div>
          </div>
        ))}
      </span>
    </div>
  );
}

const RichHtml = ({ html, className }) => {
  const clean = React.useMemo(() => sanitizeHtml(html), [html]);
  return clean ? <div className={className} dangerouslySetInnerHTML={{ __html: clean }} /> : null;
};

/* The sports arm — this build's (see the note at the top). One card per event: the sport over
   the fixture, the page's own `layer4` card and chevron, linking to the event's `href`. */
function SportEvents({ events }) {
  return (
    <div className="mt-5">
      <div className="mb-5 text-left text-lg font-extrabold text-primary">Participating Events</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
        {events.map((event, i) => (
          <SmartLink
            key={`${event.href}-${i}`}
            href={event.href}
            className="flex h-16 items-center gap-3 rounded-lg bg-layer4 px-4 transition-all hover:-translate-y-0.5"
          >
            {event.icon && <img className="size-6 flex-none" src={event.icon} alt="" />}
            <div className="min-w-0 flex-1">
              {event.sportAlt && (
                <div className="truncate text-xs font-semibold uppercase text-tertiary">{event.sportAlt}</div>
              )}
              <div className="truncate text-sm font-extrabold text-primary">{event.label}</div>
            </div>
            <IconArrow className="size-4 flex-none rotate-180 fill-secondary" />
          </SmartLink>
        ))}
      </div>
    </div>
  );
}

function ctaOf(promo) {
  if (promo.segment === 'sports') {
    return { label: 'Bet now', href: promo.sportEvents[0]?.href || promo.viewAllHref || '/sports' };
  }
  return { label: 'Play now', href: promo.qualifyingGames[0]?.href || promo.viewAllHref || '/casino' };
}

/** The page body, shared by the desktop page and the phone's sheet (./Dialog.jsx). */
export function PromotionDetailView({ promo, loading }) {
  const isDialog = useIsDialog();
  const navigate = useNavigate();
  const [termsOpen, setTermsOpen] = React.useState(false);

  const hasEnd = Boolean(promo?.endsAt) && promo?.promoStatus !== 'ended';
  const now = useNow(hasEnd);
  const status = promo ? statusOf(promo, now) : null;

  const image = promo ? artFor(promo.image) || promo.imageUrl : undefined;
  // The admin writes prizes in ₹ into the copy; they follow the header currency.
  const cur = useSelectedCurrency();
  const prize = rupeesIn(promo?.tournamentPanel?.prizePool, cur);
  const cta = promo ? ctaOf(promo) : null;

  return (
    /* `px-4 sm:px-0 pt-4` is the promotions page's own gutter (pages/Promotions): the sheet gives
       up its inset (`pageGutter`) and `.main-layout-content` has none below `sm`. */
    <div className="px-4 pt-4 sm:px-0">
      {/* `Ir` */}
      <div className="mx-auto w-full sm:pb-6">
        {/* `pr` — desktop only (`!K.mobile`); the sheet's title bar prints the title instead. */}
        {!isDialog && (
          /* The chunk writes `center mb-4 inline-flex …`. Here `.center` is unlayered
             (`display: flex`) and beats the layered `inline-flex`, which stretched the row and
             centred it on the page; spelled out as utilities so `inline-flex` holds, as it does on
             the original where the utility comes later in the same unlayered sheet. */
          <div className="mb-4 inline-flex items-center justify-center rounded-lg py-1 text-sm leading-none text-secondary">
            <div
              className="center mr-3 h-8 w-8 rounded-md bg-layer4"
              role="button"
              tabIndex={0}
              aria-label="Back to promotions"
              onClick={() => navigate('/promotions/promotion')}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/promotions/promotion')}
            >
              <IconArrow className="size-5 cursor-pointer fill-secondary" />
            </div>
            <span className="text-xl font-extrabold text-primary">Promotion</span>
          </div>
        )}

        {loading ? (
          <PendingBox />
        ) : !promo ? (
          <EmptyPlaceholder className="text-secondary">
            This promotion is not available.{' '}
            <Link to="/promotions/promotion" className="text-brand">
              See all promotions
            </Link>
          </EmptyPlaceholder>
        ) : (
          <>
            {/* `Cr` */}
            <div className="rounded-3xl max-sm:mt-3 sm:bg-layer4 sm:p-5">
              {(image || !status.permanent) && (
                /* `wr` */
                <div className="relative rounded-lg bg-layer4 py-6 sm:flex sm:justify-center sm:py-0">
                  <div className="relative mx-auto block w-fit">
                    {image && (
                      <img
                        className="mx-auto mb-4 h-40 w-40 object-contain sm:mb-6 sm:h-64 sm:w-64"
                        src={image}
                        alt={promo.imageAlt}
                      />
                    )}
                    {!status.permanent && (
                      /* `_r` */
                      <div className="mx-auto flex h-16 w-fit items-center justify-center rounded-lg bg-layer2 px-3 py-2">
                        {status.ended ? (
                          <span className="font-bold text-tertiary">Event Ended</span>
                        ) : (
                          <Countdown countdown={status.countdown} />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-xl bg-layer4 p-4 sm:mt-10 sm:bg-layer2 sm:p-6">
                {/* `$r` — only for a real end date. */}
                {promo.endsAt && (
                  <div className="ellipsis mt-auto text-sm text-secondary">
                    <span>Ends</span>
                    <span className="ml-1">{endsText(promo.endsAt)}</span>
                  </div>
                )}
                <div>
                  <div className="items-center sm:flex sm:justify-between">
                    <div>
                      <div className="text-20px mt-4 text-left text-xl font-extrabold text-primary">{rupeesIn(promo.title, cur)}</div>
                      {promo.summary && <div className="my-1 font-semibold">{rupeesIn(promo.summary, cur)}</div>}
                    </div>
                    {prize && (
                      /* `xr`, cut to the prize line — the platform sends it pre-formatted. */
                      <div className="mb-5 mt-5 flex justify-between rounded-lg bg-layer2 p-2.5 sm:max-w-96 sm:bg-layer3">
                        <div className="w-full">
                          <div className="flex w-full items-center gap-5 sm:w-fit">
                            <div className="text-base font-extrabold text-tertiary">Total Prize:</div>
                            <div className="ml-auto text-right">
                              <div className="break-all text-xl font-extrabold text-brand">{prize}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  {/* `Tr` */}
                  {promo.description && (
                    <div className="event-detail">
                      <RichHtml
                        html={rupeesIn(promo.description, cur)}
                        className="promotion-richStyle mb-4 text-sm leading-normal text-secondary"
                      />
                    </div>
                  )}
                  {/* `Lr`, inside the shared Accordion on request. */}
                  {promo.termsHtml && (
                    <Accordion>
                      <AccordionItem
                        open={termsOpen}
                        onToggle={() => setTermsOpen((v) => !v)}
                        trigger={<span className="text-primary">Terms &amp; Conditions</span>}
                        itemClassName="rounded-lg bg-layer3"
                        triggerClassName="h-12"
                      >
                        <RichHtml
                          html={rupeesIn(promo.termsHtml, cur)}
                          className="promotion-richStyle mb-4 text-sm leading-normal text-secondary"
                        />
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
              </div>

              {/* The CTA — `ne` with `type: "brand", size: "l"`. */}
              <div className="flex justify-center">
                <SmartLink
                  href={cta.href}
                  className="button button-brand button-l mt-5 w-72 text-lg font-bold max-sm:w-full"
                >
                  {cta.label}
                </SmartLink>
              </div>
            </div>

            {/* `Ar` */}
            {promo.qualifyingGames.length > 0 && (
              <div className="mt-5">
                <div className="mb-5 text-left text-lg font-extrabold text-primary">Participating Games</div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3 xl:grid-cols-8">
                  {promo.qualifyingGames.map((game, i) => (
                    <GameTile
                      key={`${game.href}-${i}`}
                      index={i}
                      name={game.name}
                      image={game.img}
                      slug={game.slug}
                      href={game.href}
                    />
                  ))}
                </div>
              </div>
            )}

            {promo.sportEvents.length > 0 && <SportEvents events={promo.sportEvents} />}
          </>
        )}
      </div>
    </div>
  );
}

export default function PromotionDetail() {
  const { segment, slug } = useParams();
  const { promo, loading } = usePromotion(segment, slug);
  return <PromotionDetailView promo={promo} loading={loading} />;
}
