import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Select from '../../components/shared/Select';
import HelpIcon from './icons';
import { TOPICS, ROUTE_IDS, DEFAULT_TOPIC, FAIRNESS_DOC } from './topics';
import { getOriginals, validateLinkFor } from '../../services/help';
import { useResource } from '../../hooks/useResource';
import './Help.css';
import Loading from '../../components/shared/Loading';
import * as globMaps from './index.globs.js';

/* The Help Center — `/help/:helpId`, and `/help/provably-fair` in particular.
 *
 * THIS PAGE IS TWO FEDERATED REMOTES, not part of the main bundle at all. topics.js documents
 * the structure and how both were recovered; the short version is that the SHELL comes from
 * `/modules/static/` and the Provably Fair BODY from `/modules/games/`, and `hash.game` serves
 * both under `/modules/<name>/assets/` the same way it serves `/assets/`.
 *
 * WHAT IS BUILT. The shell, the full seventeen-row rail with its own icons, and the Provably
 * Fair pane — which is the page that was asked for and the one `/help` itself redirects to.
 * The rail's other sixteen rows are real routes and navigate correctly, but their documents are
 * NOT bundled here: each is a separate lazy chunk per locale (twenty-one of them for en-US,
 * named in `createHtmlFile-Bp8HPAMX.js`), and they render the empty pane until fetched. The
 * thirty GAME fairness documents ARE all here, because the Provably Fair dropdown switches
 * between them and that is this page's own content.
 *
 * THE SELECT IS THE SITE'S. `nO` in the main bundle, already built as components/shared/Select —
 * the chunk passes `class="flex-1 bg-layer3"` and renders each option as
 * `<span class=font-extrabold>{label}</span>`, which is what the children render prop is for.
 */

/* Every fairness document, extracted from the `games` remote's per-locale chunks into raw HTML.
   `?raw` rather than a JS module because they ARE documents — see Help.css, which styles them by
   element exactly as the original does, since they carry almost no classes. */
const docs = globMaps.docs;
const docFor = (name) => docs[`./fairness/${name}.html`];

/* The other sixteen rail rows' documents — all 21 en-US files the `static` remote ships, pulled
   the same way and extracted out of their per-locale chunks. 454KB of the site's own legal and
   support copy. */
const topicDocs = globMaps.topicDocs;

/* `q()` in createHtmlFile-Bp8HPAMX.js — the documents ship with placeholders and the remote
   substitutes them at render. Missing this leaves raw `__BC_HOST__` in the middle of the terms
   of service. The mail address is a CONDITIONAL there: `compliance@bcgame.com` when the host is
   `bc.game`, `support@<host>` otherwise — the first branch is the one this build takes. */
const ENV = {
  __BC_HOST__: 'BC.GAME',
  __SMALL_BC_HOST__: 'bc.game',
  __BC_SITENAME__: 'BC',
  __SMALL_BC_MAIL_ADDRESS__: 'compliance@bcgame.com',
};

const topicHtml = (element) => {
  const raw = element && topicDocs[`./topics/${element}.html`];
  if (!raw) return null;
  return raw.replace(/__[A-Z_]+__/g, (token) => ENV[token] ?? token);
};

/* ------------------------------------------------------------------ the Provably Fair pane */
function ProvablyFair() {
  const { data: games } = useResource(getOriginals);
  const [game, setGame] = React.useState(null);

  /* The chunk seeds the Select with the first row of the feed the moment it arrives
     (`e(n[0])` inside the options memo) rather than shipping a default. Derived rather than
     stored so the first render already has it — setting it from an effect would blank the pane
     for a frame and trip the cascading-render rule. */
  const options = games ?? [];
  const selected = game ?? options[0] ?? null;

  /* The Select's value IS the feed's first row, so until `/game/home/recommend/selection/` lands
     there is no game chosen and therefore no fairness document to show — the pane is one read
     from top to bottom. `h-96` rather than the document's own height, which varies by game. */
  if (!selected) {
    return (
      <div className="center h-96 p-4">
        <Loading />
      </div>
    );
  }

  /* `F[gameUnique] || "general"` — the chunk's own fallback, so a game with no document of its
     own gets the generic fairness page rather than an empty pane. */
  const html = docFor(FAIRNESS_DOC[selected.value] ?? 'general');
  const validate = validateLinkFor(selected.value);

  return (
    <div className="p-4 pb-8" id="game2-provably-fair">
      <section className="flex gap-6 sm:w-80 items-center">
        <p className="!text-primary font-extrabold">Game</p>
        {/* 257.33 x 40. Neither number is set here and neither should be: the height is
            `button-m` (2.5rem) and the width falls out of `flex-1` inside the section's
            `sm:w-80` — 320 minus the 24px gap minus the "Game" label's own 38.67px is exactly
            257.33. Hardcoding either would freeze a value that is currently derived.

            `button-m` USED TO BE passed from this call site as a workaround, and the note here
            said the real repair was to move it into the component. It has been: the rendered DOM
            is `button button-m select bg-input_bright flex-1 bg-layer3`, where the first four
            now all come from the component — `size || !ee.mobile && "m"`, the way the site's own
            Button does it — and only the last two from here. Explore's filters were the other
            page carrying a compensation for it (`!h-10 … text-sm`, which restored the height but
            not the radius or the line box) and both are gone. */}
        <Select
          className="flex-1 bg-layer3"
          value={selected}
          options={options}
          onChange={setGame}
          title="Game"
        >
          {(option) => <span className="font-extrabold">{option.label}</span>}
        </Select>
      </section>

      <p className="my-4 !text-primary font-extrabold">Fairness</p>

      {/* The wrapper's class list is the rendered DOM's, and two of them are load-bearing:
          `leading-normal` is where the prose's 21px line-height actually comes from (1.5 over
          the app's 14px body — so it is inherited, not declared, which is why Help.css must not
          pin a line-height and undo it), and `!bg-layer4` matters because the pane behind it is
          already layer4; the `!` is there to beat a rule that no longer ships, exactly like
          `!to-layer4` on the VIP perk cards.

          The extra `<div>` inside is the original's too — the document is mounted one level
          down, not directly under the wrapper.

          Dangerously-set because these are documents rather than markup this project authored,
          the same call the footer's `.feedback-html` block makes. They are static files
          extracted from the deploy at build time, not fetched at runtime. */}
      <div className="leading-normal select-text !bg-layer4 text-secondary pb-6 game-fairness w-full font-semibold">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      {/* Only when the game has a `validateLink` in the games remote's config — the chunk wraps
          the button in `Show when={!!config}`. It opens the verifier on its own origin
          (`game-verify.github.io`), which is why this is an anchor rather than a route. */}
      {validate && (
        /* `inline-block`, not `block` — a block anchor stretches and the button reads as
           full-width even when it is not. 160x40, measured off the capture (the button runs
           377..577 device px at dpr 1.25, and 40px is `button-m`'s own height). */
        <a href={validate} target="_blank" rel="noreferrer" className="inline-block">
          <button type="button" className="button button-brand button-m w-40">
            Validate
          </button>
        </a>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- a document topic
 *
 * THE DOCUMENTS ARE ACCORDIONS, not flat prose. Each file is a run of `<section>` elements with
 * an `<h2>` at the top of each — 13 of them in the privacy policy — and the remote turns every
 * section into a collapsible row: the `<h2>` becomes the trigger and everything after it the
 * body. Rendering the file straight through, as this did at first, printed the whole document
 * expanded with the headings as plain text.
 *
 * SINGLE-SELECT. Opening a row closes the one before it, so at most one body is ever visible —
 * the same mode the VIP page's FAQ uses, and unlike the Provably Fair FAQ, where each row is its
 * own independent Collapsible. The first section starts open, which is what the capture shows:
 * "Privacy Policy" is expanded over its intro while every numbered section below is shut.
 *
 * The open row is reset by REMOUNTING (the call site passes `key={topic.id}`) rather than by an
 * effect — writing state in an effect on a prop change is the cascading render that
 * `react-hooks/set-state-in-effect` rejects, and the same reason the promotions tab indicator
 * measures onto the node. */
/* The site's single chevron, rotated per state — the same path the Select's trigger draws and
   the same one the Referral FAQ and the promotions pager use. Base points LEFT, so `rotate-180`
   is right (closed) and `rotate-[270deg]` is down (open). */
const ChevronIcon = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <path d="M19.6912 5.6L9.2912 16L19.6912 26.4L22.7088 23.3824L15.3264 16L22.7088 8.6176L19.6912 5.6Z" />
  </svg>
);

const SECTION_RE = /<section[^>]*>([\s\S]*?)<\/section>/g;
const H2_RE = /<h2[^>]*>([\s\S]*?)<\/h2>/;

function toSections(html) {
  const out = [];
  SECTION_RE.lastIndex = 0;
  let match;
  while ((match = SECTION_RE.exec(html)) !== null) {
    const inner = match[1];
    const heading = inner.match(H2_RE);
    if (!heading) continue;
    out.push({
      /* The heading can carry inline markup; the trigger wants text. */
      title: heading[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
      body: inner.replace(H2_RE, '').trim(),
    });
  }
  return out.length ? out : null;
}

/* Everything on the rail except Provably Fair, whose element is a component rather than a file.
   `Support` (`contactus`) is the other exception — its element is a live-chat block in the
   remote, so it has no document and falls through to the empty state rather than rendering
   someone else's copy. */
function TopicDoc({ topic }) {
  const html = topicHtml(topic?.element);
  const sections = React.useMemo(() => (html ? toSections(html) : null), [html]);
  const [open, setOpen] = React.useState(0);

  if (!html) return <div className="p-4 text-secondary">{topic?.label}</div>;

  /* A document with no `<section>` wrappers renders whole rather than not at all. */
  if (!sections) {
    return (
      <div className="help-doc leading-5 select-text w-full p-4 pb-8 font-semibold text-secondary">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  }

  return (
    <div className="help-doc leading-5 select-text w-full p-4 pb-8 font-semibold text-secondary">
      {sections.map((section, i) => (
        <div key={section.title || i}>
          <div
            className="flex cursor-pointer items-center justify-between gap-3 py-4"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="font-extrabold text-primary">{section.title}</span>
            {/* `size-8`, NOT the shared Collapsible's `size-6`. Measured off the capture: the
                boxes run 40 device px tall at dpr 1.25, i.e. 32 CSS, on an 80 device / 64 CSS
                row pitch. With `py-4` either side that box IS the row height — 16 + 32 + 16 —
                so the 24px box was what made these rows 56px and the spacing read tighter than
                the original. The icon inside stays `size-4`.

                `rotate-180` closed points the chevron right, `rotate-[270deg]` open turns it
                down, which is what the capture shows on the expanded first row. */}
            {/* `bg-layer5` and `fill-primary`, both sampled off the capture — the box interior
                reads #3A4142 (layer5), not the shared Collapsible's `button_bright` #464F50,
                and the glyph core samples white rather than secondary's #B3BEC1. The PATH is
                unchanged and correct: `IconArrow-ppk0ChIo.js` in the static remote carries the
                identical `d`, so this accordion draws the same chevron as everything else and
                only its colours differ. */}
            <div className="flex-none size-8 flex items-center justify-center bg-layer5 rounded-md">
              <ChevronIcon
                className={`icon size-4 fill-primary transition-all duration-300 ${
                  open === i ? 'rotate-[270deg]' : 'rotate-180'
                }`}
              />
            </div>
          </div>
          {open === i && <div dangerouslySetInnerHTML={{ __html: section.body }} />}
        </div>
      ))}
    </div>
  );
}

/* `o2` — THE MOBILE SHELL, and the rail is not narrowed on a phone, it is REPLACED. The chunk
 * branches the whole layout on the same flag the route does:
 *
 *   <Show when={z.mobile} fallback={<Desktop routes routesMap/>}><Mobile routes routesMap/></Show>
 *
 * and the mobile half is three elements — a `PageLayout` whose title becomes the dialog's bar, a
 * sticky section holding the site's own Select over the SAME route ids the rail lists, and one
 * card for the document:
 *
 *   <PageLayout title={t("Help Center")}>
 *     <section class="sticky top-0 z-20 bg-layer2 py-4">
 *       <Select class="w-full" value={current} options={routes}
 *               onChange={c => navigate(`/help/${c}`, {replace: !0})}>
 *         {c => <label>{routesMap[c()]?.label()}</label>}
 *       </Select>
 *     </section>
 *     <div class="page-info mb-4 rounded-xl bg-layer4">{element}</div>
 *   </PageLayout>
 *
 * `replace` on the navigation is the rail's own rule one arm over: moving between topics does not
 * push history, so Back leaves the Help Center rather than walking the list.
 *
 * The Select needs no mobile arm of its own — `components/shared/Select` already opens as a bottom
 * sheet below lg, which is `js`'s `t.dropdownType ? … : ee.mobile` deciding between `CS` and `wS`.
 * That is where the "Select" title and the drag handle in the capture come from.
 *
 * `page-info` is a dead class — not in the static remote's own stylesheet, nor the mirror's six,
 * nor the current deploy's. Kept like `page-main` and `header-nav-item`. */
function MobileHelp({ active, children }) {
  const navigate = useNavigate();

  return (
    <>
      {/* `top-0`, not the desktop arm's 60: inside a dialog the scroller IS the sheet, so there
          is no fixed header above it to clear. */}
      <section className="sticky top-0 z-20 bg-layer2 py-4">
        <Select
          /* THE VALUE IS BOLD ON THE TRIGGER AND NOT IN THE SHEET — requested, and it belongs on
             the trigger's own class list rather than in a render prop. `labelRender` was tried
             and is wrong twice over: it replaces the button's WHOLE content, so the chevron in
             its `ms-auto` square goes with it — and that square is what holds the value at the
             start, so losing it let `.button`'s centring pull the label into the middle. Weight
             inherits, the sheet's rows are portalled elsewhere and inherit nothing from here, so
             one utility does it. `font-extrabold` is the site's own idiom for a bold Select value
             (the Provably Fair pane's Game select). The chunk writes a bare `<label>`, so this is
             a departure — one word. */
          className="w-full font-extrabold"
          value={active}
          options={ROUTE_IDS}
          onChange={(id) => navigate(`/help/${id}`, { replace: true })}
        >
          {(id) => <label>{TOPICS.find((t) => t.id === id)?.label}</label>}
        </Select>
      </section>

      <div className="page-info mb-4 rounded-xl bg-layer4">{children}</div>
    </>
  );
}

/* ------------------------------------------------------------------------------ the shell */
export default function Help({ mobile = false }) {
  const { helpId } = useParams();
  const active = TOPICS.some((t) => t.id === helpId) ? helpId : DEFAULT_TOPIC;
  const topic = TOPICS.find((t) => t.id === active);

  /* The one pane, built once and handed to whichever arm — the original passes the same
     `routesMap[id].element` into both branches for the same reason. */
  const pane =
    active === 'provably-fair' ? (
      <ProvablyFair />
    ) : (
      /* `key` so switching topics remounts and the open row resets to the first — see the note
         on TopicDoc for why this is not an effect. */
      <TopicDoc key={topic?.id} topic={topic} />
    );

  if (mobile) {
    return <MobileHelp active={active}>{pane}</MobileHelp>;
  }

  return (
    /* `-mt-3` cancels `--header-mb`, which `.main-layout-content` folds into its padding-top
       for every route. The original has NO gap here at all: measured off the capture the
       header ends at y=74 and the heading's line box starts at 75, so "Help Center" sits
       directly under the header. Page-local rather than a change to the shared variable. */
    <div className="-mt-3 pb-4">
      {/* 18px (`text-lg`, not `text-xl`), and `leading-none` so the box is the glyph rather
          than 18px in a 28px line. `-mt-3` above already cancels `--header-mb`; what was left
          after it was this line box's 5px of half-leading, which reads as a gap even though
          nothing is setting a margin. `mb-10` restores the 40px the tighter box gives back, so
          the cards below stay where they were measured. */}
      {/* `mb-12` is OURS, opened up on request, and it is a deliberate departure. The capture
          puts the rail card's top edge at 120px (150 device at dpr 1.25); `leading-none` makes
          the box the font-size, so the stack is 60 content top + 3 `mt-0.75` + 18 box + the
          margin. That means the measured value is 36-40px (`mb-9` lands at 117, `mb-10` at 121)
          and 48 sits deliberately below the fold of that. `mb-10` is the closest match to the
          original if this is ever reverted. */}
      {/* Sticky, and three things have to move together for that to work rather than just pin:
       *
       * - A BACKGROUND. A sticky element with no fill lets the rail and the document scroll
       *   straight through the text. `bg-layer2` is the page background (#232626), so the block
       *   reads as the page rather than as a bar.
       * - THE GAP AS PADDING, not margin. A margin is outside the box, so the background stops
       *   at the text and content would still show through the 39px below it. `pb-9.75` is the
       *   same 39px moved inside, which keeps the spacing identical and lets the fill cover it.
       * - THE TOP OFFSET AS PADDING TOO, and for a second reason: `top-15` is 60px, but a
       *   `mt-0.75` would leave the box's natural position at 63 while pinning it at 60 — so
       *   the heading jumped 3px upward the instant sticky engaged. Margins are outside the
       *   box and `top` measures the box, so the two disagreed. As `pt-0.75` the box starts at
       *   60, `top-15` pins it exactly where it already sits, and nothing moves. The text is
       *   still 3px down from the box edge, so it renders in the same place as before.
       *
       * STICKY, AND DELIBERATELY UNDERNEATH THE RAIL. Both this and the rail pin at 60px, and
       * the rail carries the higher z-index, so once the page scrolls far enough the rail rides
       * up and covers the heading completely. That is why "Help Center" is nowhere on screen in
       * the scrolled capture even though it never stops being pinned — it is hidden, not gone.
       *
       * NO BACKGROUND on purpose. A fill here would paint a bar clear across the pane, and the
       * capture rules that out: at the heading's own height the document's text runs right to
       * the top of the pane with nothing behind it. It works because "Help Center" is about
       * 100px wide and the rail is 240px, so the rail alone is enough to cover the text.
       *
       * The spacing is padding rather than margin because `top` measures the box: as margins
       * the box would sit 3px below where it pins and the heading would jump on engaging. */}
      <h1 className="sticky top-15 z-10 pb-9.75 pt-0.75 text-lg font-extrabold leading-none text-primary">
        Help Center
      </h1>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* The rail. 240px (`w-60`), measured: the card runs 341..641 device px in a capture at
            dpr 1.25, i.e. 240 CSS, and 240 + 16 gap + 960 pane is exactly the 1216 container.
            `px-3 py-2` is measured too — the active pill insets 12px horizontally and 8px
            vertically, which is not a uniform `p-*`.

            `bg-layer4` (#323738), not layer3: this rail is a card on the page background, one
            step lighter than the header.

            STICKY IS OURS, and it is a deliberate departure — asked for, so the rail holds
            while the document beside it scrolls. The scrolled capture shows the original doing
            the opposite: there the rail card runs off the top of the viewport with "Law
            Enforcement" (row 5) as the first visible row, so on the live site it scrolls away
            with the page. Drop `lg:sticky lg:top-18` to match the original again.

            `top-30` is 120px — the bottom edge of the pinned heading (which occupies 60..120),
            so the rail pins DIRECTLY BELOW it and neither ever moves while the document scrolls.
            Both stay put for the whole of the document's scroll.

            The overlap at the end is not something this offset causes, it is sticky's own rule:
            an element only sticks WITHIN ITS CONTAINING BLOCK, so when the flex row's bottom
            edge finally comes up the rail is carried out with it, sliding up over the heading.
            `z-20` against the heading's `z-10` is what makes it cover the heading on the way
            rather than pass behind it.

            `top-15` (60) was wrong for exactly this reason: it pinned the rail on top of the
            heading after only ~60px of scroll, so the rail appeared to jump up and swallow the
            heading almost immediately instead of holding position.

            Caveat: 120 plus seventeen 40px rows and padding (~696px) means a window shorter
            than about 820px cannot show the rail's last rows. The fix there is a max-height
            with its own overflow, not a smaller offset — a smaller one reintroduces the early
            overlap this was set to remove. */}
        <nav className="relative z-20 h-fit w-full flex-none rounded-xl bg-layer4 p-2 lg:sticky lg:top-30 lg:w-60">
          {TOPICS.map((t) => (
            /* The class list below is the rendered DOM's, verbatim. Four things it settles:
             *
             * - `h-10` declares the 40px row outright; the `py-2.5` this had was arriving at the
             *   same number by arithmetic over a 20px line, which breaks the moment the label
             *   wraps.
             * - NO font-size or line-height classes. The row inherits the app's 14px/1.5, which
             *   IS the 14px/21px wanted here — so `text-sm leading-normal` was correct in value
             *   and wrong in mechanism, and is gone.
             * - `active-tab-group` rather than `bg-layer5`. Same pixels (`--Chip-Group-Tab` is
             *   #3a4142), but it is the original's own name for the selected-chip background;
             *   the rule is in index.css and points at the layer5 token.
             * - `replace`, which the original carries as `replace="true"`. Moving between help
             *   topics does not push history, so Back leaves the Help Center rather than walking
             *   the rail. */
            <Link
              key={t.id}
              to={`/help/${t.id}`}
              replace
              /* Two weights, and the inactive one is 600 — NOT 400. Read off the capture rather
                 than reasoned about: at 3x, "Privacy Policy" and "Terms Of Service" carry
                 visibly thicker strokes than regular would give at 14px, and only "Provably
                 Fair" is the heavier 800. 400 renders a full step too light against the
                 original, which is what a side-by-side showed.
                 Averta ships 400/600/800 here, so 600 is a real face and not a synthesised one. */
              className={`h-10 rounded-lg flex items-center gap-1 px-4 ${
                t.id === active
                  ? 'text-primary active-tab-group font-extrabold'
                  : 'text-secondary font-semibold'
              }`}
            >
              {/* `icon`, not `fill-current`. The icons carry no `fill` of their own — as the
                  BetBy sprites do not — but the class that supplies it is the site's own
                  `.icon` (`fill: currentColor`, index-DxOqNczA.css), which is already in
                  index.css. `fill-current` was doing the same job under a different name.
                  `.icon`'s own 2rem is beaten by `size-5` because the rule is layered. */}
              <HelpIcon id={t.id} className="icon size-5 flex-none" />
              {/* `overflow-hidden whitespace-nowrap` is the original's: the rail is a fixed
                  240px and "Sport Betting Insights"-length labels must clip rather than wrap,
                  which is also why the row can carry a hard `h-10`.

                  `18+` is not part of the label string — the icon for this row IS the 18+ mark,
                  and the text beside it is just "Gamble Aware". */}
              <span className="overflow-hidden whitespace-nowrap">{t.label}</span>
            </Link>
          ))}
        </nav>

        {/* `layer4` as well — the pane and the rail are the same card colour, and the capture
            samples #323738 on both.

            `min-h-100` is OURS and it is there to stop a layout shift the original never has.
            Sixteen of the rail's rows have no document bundled, so switching to one collapsed
            the page from several screens to a couple of hundred pixels — the scrollbar vanished
            and every box on the page slid sideways by its width. 400px is not arbitrary: it is
            the height of the chunk's own loading fallback (`<div class="center flex h-100
            w-full">`), so it is the figure the original itself reserves for a pane with nothing
            in it yet. Once the remaining documents are bundled this stops mattering. */}
        <div className="min-h-100 min-w-0 flex-1 rounded-xl bg-layer4 text-secondary">{pane}</div>
      </div>
    </div>
  );
}
