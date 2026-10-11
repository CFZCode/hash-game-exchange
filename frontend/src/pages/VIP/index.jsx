import React from 'react';
import { Link } from 'react-router-dom';
import { getVipClub } from '../../services/vip';
import { useResource } from '../../hooks/useResource';
import { useSession } from '../../context/session';
import useMediaQuery from '../../hooks/useMediaQuery';
import { Accordion, AccordionItem } from '../../components/shared/Accordion';
import Loading from '../../components/shared/Loading';

/* The VIP Club — `/vip-detail`.
 *
 * That is the original's own path (`component: c(() => L.VipDetail())`), and `/vip` is a
 * guarded alias that redirects onto it (`guards: [() => "/vip-detail"]`), which is why both are
 * routed in App.jsx. It is what the sidebar's VIP Club row means; that row had the sprite and
 * nowhere to go.
 *
 * NOTHING HERE IS INFERRED. The page's chunk was recovered from the deploy's second origin —
 * services/vip.js documents the method, and it is the one worth reading, because it reopens
 * every `/assets/…-HASH.png` and every missing chunk that CLAUDE.md currently records as
 * unrecoverable. So the copy is verbatim `t("…")` out of `index-DLlkBGhd.js`, the class lists
 * below are the rendered DOM's, and the artwork is the deploy's own files.
 *
 * TWO DEAD CLASSES ARE KEPT rather than tidied, both the original's own:
 *
 * - `bg-from-special` on every perk card generates NO rule. It is not in the page's stylesheet
 *   (`detail-CKVlkrmQ.css` holds one unrelated `.sport-icon-svg` rule) and not in the main
 *   bundle either, on the saved build or on the current deploy. The card is therefore
 *   `from-layer4 !to-layer4` — a gradient between one colour, i.e. flat #323738, which is what
 *   the capture samples at. The `!` on the second stop is the giveaway: it was written to beat
 *   a rule that no longer ships.
 * - `inactive` on the hero's link is the router's not-the-current-route marker and has no rule
 *   either.
 *
 * WHAT IS SIGNED-OUT ONLY. Two blocks sit behind `!x.login` in the chunk — the hero's Join Now
 * button and the whole VIP Transfer block under the film — and three class lists change with
 * it. All five are reproduced off `session.login`, so signing in through the auth dialog
 * rearranges this page exactly as it rearranges the header.
 *
 * MOBILE. The route carries `dialog: m.mobile ? {behavior: "transparent-title"} : !1`, so below
 * `sm` the original presents this as a full-screen sheet with an `IconVipclub` title rather than
 * as a page — and THAT IS BUILT NOW, in Dialog.jsx, mounted from App.jsx. This file is unchanged
 * by it: `Mt`, the chunk's root, is a `<Show when={S.mobile}>` that wraps these same children in
 * a `PageLayout` whose only job is to push the title into the manager's bar, and `PageLayout`
 * draws nothing. So the page still renders as a page and its own `sm:` arms go on doing the work.
 */

/* One glob for the page, as the promotions and deposit-offer pages each keep one: it has to
   live in the module it resolves relative to, so a shared helper is not an option. */
const art = import.meta.glob('../../assets/vip/*.png', { eager: true, import: 'default' });
const artFor = (name) => art[`../../assets/vip/${name}.png`];

/* The gold button (`ge` in the chunk): a `.button.button-m` plus a left-running gradient and a
   2px hard shadow standing in for a bevel. Both the hero CTA and the transfer CTA are this. */
const GOLD_BUTTON =
  'button button-m bg-gradient-to-l from-[#EED8B3] to-[#E6C180] shadow-[0px_2px_0px_0px_#947339]';

/* The gilded split heading used three times — "Only BC.GAME Defines / True VIP", "Experience /
   Premium VIP Rewards", "Play and Engage for / VIP Access". `ml` differs between the transfer
   one (`ml-1`) and the other two (`ml-2`); that is the original's, not a slip. */
const GoldHeading = ({ lead, accent, className = '', accentMargin = 'ml-2' }) => (
  <div className={`flex flex-col text-center text-4xl font-extrabold sm:flex-row sm:text-start ${className}`}>
    <span>{lead}</span>
    <span
      className={`${accentMargin} bg-gradient-to-r from-[#EED8B3] to-[#E6C180] bg-clip-text text-transparent`}
    >
      {accent}
    </span>
  </div>
);

/* A perk card. The artwork overhangs the card by `-mt-12` from inside it, which is why the card
   itself carries `mt-12` — the pair is what keeps the grid rows evenly pitched while the icon
   floats above each one. */
const PerkCard = ({ perk }) => (
  <div className="bg-from-special relative mt-12 flex h-56 flex-shrink-0 rounded-xl bg-gradient-to-b from-layer4 !to-layer4">
    <div className="-mt-12 flex w-full flex-col items-center">
      <div className="relative mt-2 h-[6.5rem] flex-shrink-0 sm:mt-0 sm:h-[8.5rem]">
        <img className="h-full" alt="img" src={artFor(perk.icon)} />
      </div>
      <div className="relative px-3 pb-5 text-center">
        <div className="text-xl font-extrabold text-primary sm:text-lg">
          <div>{perk.title}</div>
        </div>
        <div className="mt-2 px-1 text-base font-semibold text-secondary sm:px-6 sm:text-base">
          {perk.desc}
        </div>
      </div>
    </div>
  </div>
);

/* The FAQ. Single-select, because the shared Accordion defaults to `bh.Single` and this call
   site passes no `multiple` — opening a row closes the previous one. Closed rows render no
   content element at all, which is what the capture shows.
 *
 * The rail's third row is a LINK, not a tab: the chunk calls
 * `window.open("/help/terms-service", "_blank")` and never changes selection, so it never takes
 * the `bg-layer5` pill. */
const Faq = ({ title, tabs }) => {
  const [tabId, setTabId] = React.useState(tabs.find((t) => t.kind === 'tab')?.id);
  const [openQuestion, setOpenQuestion] = React.useState(null);

  const active = tabs.find((t) => t.id === tabId);

  const select = (tab) => {
    setTabId(tab.id);
    /* The chunk replaces the whole item list on a tab change, which drops the accordion's
       selection with it — a row left open on General does not stay open on Benefits. */
    setOpenQuestion(null);
  };

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex w-full justify-center">
        <span className="text-center text-4xl font-extrabold text-primary sm:text-xl">{title}</span>
      </div>
      <div className="flex w-full flex-col items-center justify-between gap-2 sm:flex-row sm:items-start">
        <div className="flex h-fit w-4/5 flex-row gap-4 rounded-xl bg-layer4 px-2 py-2 text-center text-base font-extrabold sm:w-40 sm:flex-col sm:py-4 sm:text-sm">
          {tabs.map((tab) =>
            tab.kind === 'link' ? (
              <a
                key={tab.id}
                href={tab.href}
                target="_blank"
                rel="noreferrer"
                className="w-full cursor-pointer rounded-md px-4 py-2"
              >
                {tab.label}
              </a>
            ) : (
              <div
                key={tab.id}
                className={`w-full cursor-pointer rounded-md px-4 py-2 ${tab.id === tabId ? 'bg-layer5' : ''}`}
                onClick={() => select(tab)}
              >
                {tab.label}
              </div>
            )
          )}
        </div>
        <div className="w-full flex-1 rounded-md bg-layer4 px-1 py-4">
          {/* `lk`'s registered styles now live in components/shared/Accordion — this page was
              the first call site and `/wallet/vault` is the second. All this one adds is the
              trigger's `!text-base font-semibold`, which is why a `text-sm` from the registered
              style sits next to a `!text-base` that beats it. */}
          <Accordion>
            {(active?.items ?? []).map((item) => {
              const open = openQuestion === item.question;
              return (
                <AccordionItem
                  key={item.question}
                  open={open}
                  onToggle={() => setOpenQuestion(open ? null : item.question)}
                  triggerClassName="!text-base font-semibold"
                  trigger={item.question}
                >
                  {item.answer}
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </div>
    </div>
  );
};

export default function VIP() {
  const { data } = useResource(getVipClub);
  const { session } = useSession();
  const login = session.login;
  /* `S.mobile` on THIS page reads as the 640 line, not the 1024 one the rest of the project
     uses for that flag — and the markup itself is what forces the exception.

     The hero's mobile arm is `-ml-4 w-[calc(100%+32px)]`, which exists for exactly one reason:
     to cancel the page root's own `px-4` and go full-bleed. That padding is `px-4 sm:px-0`,
     i.e. it stops at 640. Gate the arm at 1024 and every width in 640–1023 gets the negative
     margin with no padding left to cancel — the banner pulls 16px past the layout gutter on
     the left and 32px wider than its container, which is a visible misalignment against the
     original, where a browser window that wide is not `S.mobile` at all.

     The banner IMAGE swap moves with it rather than keeping its own breakpoint: splitting them
     would put the mobile artwork (one wide image, no coins) inside the desktop-padded container
     across that same band. Both are the one flag in the chunk and they stay one flag here.

     What is genuinely lost is that `S.mobile` is a DEVICE test, so the original does reach its
     mobile arm above 640 — a phone in landscape at 844×390 is mobile to it, which is what the
     `sm:` variants inside both banner templates are there to serve. No width query can express
     that. 640 is the reading that matches in a browser, which is where this gets compared. */
  const isDesktop = useMediaQuery('(min-width: 640px)');

  /* One read for the whole page — the hero, the film, the perk cards, the access and engage
     blocks and the FAQ are all fields of it, and its copy is i18n compiled into the chunk rather
     than anything fetched, so there is no partial state to render around a spinner. */
  if (!data) {
    return (
      <div className="center h-[60vh] px-4 sm:px-0">
        <Loading />
      </div>
    );
  }

  const { hero, video, transfer, rewards, perks, more, access, engage, faq } = data;

  return (
    <div className="flex flex-col gap-y-4 px-4 text-primary sm:gap-y-6 sm:px-0 sm:pt-sh">
      {/* ------------------------------------------------------------------------- hero */}
      {/* Three-way, not two: `S.mobile ? "-ml-4 w-[calc(100%+32px)]" : login ? "" : "mt-3"`.
          The mobile arm cancels the page root's own `px-4` so the banner goes full-bleed, and
          it wins over the signed-in test rather than combining with it. */}
      <div
        className={`relative flex w-full flex-col overflow-hidden rounded-md p-9 sm:min-h-64 ${
          !isDesktop ? '-ml-4 w-[calc(100%+32px)]' : login ? '' : 'mt-3'
        }`}
      >
        {/* The backdrop's own class list is the one that changes with sign-in: signed out it
            is pinned to the top-left at full width, signed in it is scaled up and centred so
            the crown clears the level card the original puts here. Which FILE it points at is
            picked by `r[+S.mobile<<1 | +!W.darken]` in the chunk — a two-bit index into
            [bg, bg_w, bg_m, bg_m_w] over (mobile, light theme). This build is dark-only, so
            only the even entries are reachable and only those two were fetched. */}
        <img
          alt=""
          src={artFor(isDesktop ? 'banner_bg' : 'banner_bg_m')}
          className={`absolute ${login ? '-top-9 left-1/2 h-[calc(100%+36px)] w-auto max-w-none -translate-x-1/2' : 'left-0 top-0 w-full'}`}
        />
        {/* A JS branch, not a `lg:` pair, because the two sides are different ELEMENTS: the
            desktop crown comes with the two flanking coins and the mobile one is a single
            wider image with none. Rendering both and hiding one would put four images on
            every phone. `S.mobile` in the chunk, which this project reads as the 1024 line
            everywhere it appears — see hooks/useMediaQuery. */}
        {isDesktop ? (
          <>
            <img
              className="absolute -top-3 left-1/2 h-auto w-full -translate-x-1/2 sm:-top-9 sm:h-[258px] sm:w-auto"
              alt=""
              src={artFor('banner')}
            />
            <img className="absolute -top-5 left-10 h-[114px]" alt="" src={artFor('coin-left')} />
            <img className="absolute -top-5 right-10 h-[102px]" alt="" src={artFor('coin-right')} />
          </>
        ) : (
          <img
            className="absolute -top-0.5 left-1/2 h-auto w-full -translate-x-1/2 sm:-top-9 sm:h-[258px] sm:w-auto"
            alt=""
            src={artFor('banner_m')}
          />
        )}
        <div className="relative z-10 mt-24 flex w-full flex-col items-center text-center sm:w-full">
          {/* `uppercase` in the class list AND `.toUpperCase()` in the chunk. Keeping the
              transform in CSS is what survives a translated string. */}
          <div className="bg-gradient-to-b bg-clip-text text-2xl font-extrabold uppercase text-transparent sm:text-3xl from-[#FFF0D7] to-[#E2B665]">
            {hero.eyebrow}
          </div>
          <div className="mb-3 bg-gradient-to-b bg-clip-text text-3xl font-extrabold uppercase text-transparent sm:text-4xl from-[#FFF0D7] to-[#E2B665]">
            {hero.title}
          </div>
          <div className="pr-4 font-semibold text-secondary">{hero.blurb}</div>
          {!login && (
            <Link to={hero.cta.href} className="w-full sm:w-[200px] inactive">
              <button className={`${GOLD_BUTTON} mt-6 w-full font-extrabold text-primary_brand`} type="button">
                {hero.cta.label}
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- film + VIP transfer */}
      <div className="-mt-4 mb-8 flex w-full flex-col items-center justify-center sm:mt-8">
        {/* `noMargin` at this call site, which is what drops the `my-9 sm:my-14 sm:ml-[50%]`
            self-centring the component applies everywhere else — the flex column already
            centres it. The poster is local; the film is the CDN's, see vip.js. */}
        <div className="group relative flex h-60 w-full justify-center overflow-hidden rounded-md sm:h-96 sm:w-2/3">
          <video className="-mt-3 h-[105%] w-full rounded-md" controls poster={artFor(video.poster)}>
            <source src={video.src} type={video.type} />
          </video>
        </div>
        {!login && (
          <>
            <GoldHeading
              lead={transfer.lead}
              accent={transfer.accent}
              accentMargin="ml-1"
              className="mt-5"
            />
            <div className="text-center font-semibold text-secondary">{transfer.blurb}</div>
            {/* A bare button, not a link — the chunk does
                `window.open(location.origin + Vh(), "_blank")` on click, and the captured DOM
                has no anchor around it. `/events/viptransfer-survey` is not built and falls to
                the catch-all in the new tab. */}
            <button
              className={`${GOLD_BUTTON} mt-6 w-2/3 font-extrabold text-primary_brand sm:w-72`}
              type="button"
              onClick={() => window.open(`${window.location.origin}${transfer.cta.href}`, '_blank')}
            >
              {transfer.cta.label}
            </button>
          </>
        )}
      </div>

      {/* ------------------------------------------------------------------------ perks */}
      <div
        className={`-mt-4 flex w-full flex-col items-center justify-center ${login ? '' : 'sm:mt-6'}`}
      >
        <GoldHeading lead={rewards.lead} accent={rewards.accent} />
      </div>

      <div className="grid grid-cols-2 gap-x-3 sm:grid-cols-3 sm:gap-y-4">
        {perks.map((perk) => (
          <PerkCard key={perk.title} perk={perk} />
        ))}
        <div className="mt-6 flex h-56 flex-col items-center justify-center sm:col-span-2 sm:flex-row">
          <img className="h-24 sm:mr-4 sm:h-32" alt="VIP club" src={artFor(more.icon)} />
          <div className="flex flex-col text-center font-semibold text-secondary sm:text-start sm:text-lg">
            {more.lines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- qualifying */}
      <div className="mt-6 flex w-full flex-col items-center justify-center">
        <GoldHeading lead={access.lead} accent={access.accent} />
      </div>

      <div className="flex w-full flex-col gap-3">
        {engage.map((row) => (
          <div key={row.title} className="flex gap-5 rounded-md bg-layer4 px-4 py-3">
            <img className="h-20" alt="VIP club" src={artFor(row.icon)} />
            <div className="flex flex-col justify-center">
              <div className="text-2xl font-extrabold">{row.title}</div>
              <div className="font-semibold text-secondary">{row.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------------------- FAQ */}
      <Faq title={faq.title} tabs={faq.tabs} />
    </div>
  );
}
