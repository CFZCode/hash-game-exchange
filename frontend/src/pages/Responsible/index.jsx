import { Link, useNavigate, useParams } from 'react-router-dom';
import ResponsibleIcon from './icons';
import GamblingLimits from './GamblingLimits';
import SelfExclusion from './SelfExclusion';
import BudgetCalculator from './BudgetCalculator';
import { NeedHelp } from './GamblingLimits';
import { TOPICS, DEFAULT_TOPIC, SELF_ASSESSMENT } from './topics';
import Select from '../../components/shared/Select';
import { useIsDialog } from '../../context/dialogRoute';
import { useSettings } from '../../context/settings';
import rgBadges from '../../assets/responsible/rg.png';
import rgBadgesLight from '../../assets/responsible/rg_w.png';
import '../Help/Help.css';

/* Responsible Gambling — `/responsible/:responsibleId`, and `/responsible` bare.
 *
 * Same shape and the same origin as the Help Center: `Enter-MsmOuq5R.js` routes both to
 * `h("ResponsibleLayout")`, and `h` is the `/modules/static/` federated remote. The layout chunk
 * is `index-CdxGH7-n.js`, pulled off `hash.game/modules/static/assets/` — see pages/Help/topics.js
 * for how that recovery works, it is the same route one directory over.
 *
 * The sticky behaviour is the Help Center's, deliberately: heading pinned at 60 under the rail,
 * rail pinned at 120 with the higher z-index so it covers the heading once the container's
 * bottom carries it up.
 *
 * ONLY FAQ'S IS BUILT, and it is the one this page opens on. Its element is the
 * `responsible_gambling` HTML document, which was already extracted for the Help Center and is
 * shared from there rather than duplicated. The other four rows — Self-Assessment, Gambling
 * Limits, Self-exclusion, Budget Calculator — are COMPONENTS in the remote, not documents:
 * `kt` builds Self-Assessment's markup inline, `St` renders a self-exclusion form, and the
 * budget calculator is an interactive widget. None are transcribed here, so they route and
 * render the empty state.
 *
 * FLAT, NOT AN ACCORDION. The document has the same `<section>`/`<h2>` shape as the help topics,
 * but this page renders it straight through — the captures show every heading and its prose
 * expanded down one continuous column, with no chevrons anywhere. Same file shape, different
 * presentation, which is why `toSections` is not reused here.
 */

const docs = import.meta.glob('../Help/topics/*.html', {
  eager: true,
  query: '?raw',
  import: 'default',
});

/* The remote's own substitution — see the note in pages/Help/index.jsx. */
const ENV = {
  __BC_HOST__: 'BC.GAME',
  __SMALL_BC_HOST__: 'bc.game',
  __BC_SITENAME__: 'BC',
  __SMALL_BC_MAIL_ADDRESS__: 'compliance@bcgame.com',
};

const docHtml = (element) => {
  const raw = element && docs[`../Help/topics/${element}.html`];
  if (!raw) return null;
  return raw.replace(/__[A-Z_]+__/g, (token) => ENV[token] ?? token);
};

/* The chunk does NOT render the document whole. It splits it and emits, per section,
 *
 *   <h2 class="text-sm font-semibold text-primary">{title}</h2>          <- see the weight note
 *   <div class="help-raw-html"><section>{body}</section></div>
 *
 * — the heading lifted OUT of its own section. That is why the rendered markup shows `<section>`
 * elements that open on a blank line: their `<h2>` has already been hoisted above them.
 *
 * THE HEADING WEIGHT IS A REQUESTED DEPARTURE: the chunk writes `font-semibold` on every one of
 * these `<h2>`s and this build renders `font-extrabold`. One word per heading to revert, and
 * there are four of them — the FAQ's section titles, Self-Assessment, and the self-exclusion
 * heading beside it.
 *
 * `font-extrabold` AND NOT `font-bold`, which is the part not to "correct" later. This project
 * ships Averta at 400/600/800 only, and CSS weight matching for a desired weight above 500
 * searches upward first — so `font-bold` (700) resolves to the very same 800 face and differs
 * from this only in reading as if a 700 were available. Writing 800 says what actually renders.
 *
 * The badge strip is a sibling too, sitting between the first heading and its section:
 * `<p><img class="mb-2 w-full sm:w-1/2">` from `/modules/static/assets/rg-BrECRvg0.png`, saved
 * here as rg.png (1066x160). `sm:w-1/2` is the original's, which is why it spans the left half
 * of the pane.
 *
 * BOTH THEMES ARE LOCAL NOW. The strip is a single flattened image of the certifier marks, so
 * unlike a token it cannot adapt — its ink is drawn for one background and the wordmarks in it
 * simply disappear on the other. `rg_w-Ba_NNOY-.png` is the light-theme twin, and this file has
 * carried its filename in a note since the strip was first fetched; it lives in the `static`
 * REMOTE (`/modules/static/assets/`) rather than in `/assets/`, which is why it is a different
 * path from every other pair in this project. */
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
      title: heading[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
      body: inner.replace(H2_RE, ''),
    });
  }
  return out;
}

/* `Ut` — the two rows the "Need Help?" block belongs to. It is the SAME list on both arms
   (`Xt` in the desktop half, `Ut` in the mobile one, both `["self-exclusion","gambling-limits"]`),
   and only its POSITION differs: beside the pane inside an `xl:flex-row` on a desktop, under the
   pane as a third sibling on a phone.

   NOTE the desktop arm here gives it to self-exclusion only, which is a divergence from the chunk
   that predates this file's mobile half and is left alone rather than folded in — changing what a
   desktop renders is not part of building a phone layout. One line when it is wanted. */
const NEED_HELP_ROWS = ['self-exclusion', 'gambling-limits'];

/* Two rows bring their own `rounded-xl bg-layer4` card in this build, so the desktop arm renders
   them bare where a document row gets the container. That is a divergence too: the chunk's `o()`
   wraps EVERY row (`noContainer` is set on exactly one row, self-exclusion, and set to FALSE), so
   on the original all five sit in one. Recorded rather than corrected, for the same reason. */
const SELF_CARDED = ['gambling-limits', 'budget-calculator'];

/* `Yt` — THE MOBILE SHELL, and it is the Help Center's one for one: the rail is replaced by the
 * site's own Select rather than narrowed, and the pane moves into a single card.
 *
 *   <PageLayout title={t("Responsible Gambling")}>
 *     <section class="sticky top-0 z-20 bg-layer2 py-4">
 *       <Select class="w-full" value={key} options={Object.keys(routesMap)}
 *               onChange={c => navigate(`/responsible/${c}`, {replace: !0})}>
 *         {c => <label>{routesMap[c()]?.label()}</label>}
 *       </Select>
 *     </section>
 *     <div class="page-info mb-4 rounded-xl bg-layer4"><Suspense>{element()}</Suspense></div>
 *     <Show when={["self-exclusion","gambling-limits"].includes(key)}><NeedHelp/></Show>
 *   </PageLayout>
 *
 * The card is UNCONDITIONAL here where the desktop arm's is per row — which is what puts a pane
 * that carries its own card inside a second one. That is the chunk's own arrangement, not an
 * oversight: `jt` wraps whatever `element()` returns.
 *
 * `page-info` is dead in all three stylesheet sets, like `page-main` and `page-container` beside
 * it. The title is the dialog's, pushed by `PageLayout`, which draws nothing — see
 * components/shared/PageDialog. */
function MobileResponsible({ active, children }) {
  const navigate = useNavigate();

  return (
    <>
      {/* `top-0`, not the desktop arm's 72: inside a dialog the scroller IS the sheet and there
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
          options={TOPICS.map((t) => t.id)}
          onChange={(id) => navigate(`/responsible/${id}`, { replace: true })}
        >
          {(id) => <label>{TOPICS.find((t) => t.id === id)?.label}</label>}
        </Select>
      </section>

      <div className="page-info mb-4 rounded-xl bg-layer4">{children}</div>

      {NEED_HELP_ROWS.includes(active) && <NeedHelp />}
    </>
  );
}

export default function Responsible() {
  const isDialog = useIsDialog();
  /* The certifier strip is a flattened image, so it cannot follow a token — see the note over
     the badge strip above for why it needs a second file rather than a colour. */
  const { darken } = useSettings();
  const { responsibleId } = useParams();
  const active = TOPICS.some((t) => t.id === responsibleId) ? responsibleId : DEFAULT_TOPIC;
  const topic = TOPICS.find((t) => t.id === active);
  const raw = docHtml(topic?.element);
  /* Only the FAQ's row carries the badge strip; the chunk attaches it to that element alone. */
  const sections = raw ? toSections(raw) : [];

  /* THE PANE'S CONTENT, WITHOUT A CARD AROUND IT — the container is the arm's job, exactly as it
     is the chunk's. `o()` on the desktop half wraps it in `<div class="rounded-xl bg-layer4">`
     and `Yt` on the mobile one wraps it in `page-info mb-4 rounded-xl bg-layer4`, so lifting it
     out is what lets both arms have the wrapper each of them wants without a second copy. */
  const paneContent =
    active === 'gambling-limits' ? (
      <GamblingLimits />
    ) : active === 'budget-calculator' ? (
      <BudgetCalculator />
    ) : active === 'self-exclusion' ? (
      <SelfExclusion />
    ) : (
      <>
        {sections.length ? (
          <div className="help-center-box help-doc select-text p-4 leading-normal font-semibold text-secondary">
            {/* KEYED ON THE INDEX AS WELL AS THE TITLE, because a heading is not unique in these
                documents: `responsible_gambling.html` carries TWO `<h2>Underage Gambling</h2>`
                sections, which is the source document's own repetition and not a parse fault —
                the second restates the policy under a later heading. `key={section.title || i}`
                collided on them, which React reports as two children with the same key and which
                would let it reuse one section's DOM for the other. The list comes from one static
                document and never reorders, so the index is a legitimate part of the key. */}
            {sections.map((section, i) => (
              <div key={`${i}-${section.title}`} className="contents">
                <h2 className="text-sm font-extrabold text-primary">{section.title}</h2>
                {/* Only under the first heading, which is where the chunk puts it. */}
                {i === 0 && topic?.id === 'faq' && (
                  <p>
                    <img className="mb-2 w-full sm:w-1/2" src={darken ? rgBadges : rgBadgesLight} alt="" />
                  </p>
                )}
                <div
                  className="help-raw-html"
                  dangerouslySetInnerHTML={{ __html: `<section>${section.body}</section>` }}
                />
              </div>
            ))}
          </div>
        ) : active === 'self-assessment' ? (
          /* A component in the chunk, not a document — transcribed in topics.js. Same
             `help-center-box` shell and the same `h2` + `help-raw-html` alternation the FAQ's
             tab renders, so it picks up the shared `.help-doc` styling unchanged. */
          <div className="help-center-box help-doc select-text p-4 leading-normal font-semibold text-secondary">
            <h2 className="text-sm font-extrabold text-primary">Self-Assessment</h2>
            <div className="help-raw-html">
              <p>{SELF_ASSESSMENT.intro}</p>
            </div>
            <h2 className="text-sm font-extrabold text-primary">
              {SELF_ASSESSMENT.questionsTitle}
            </h2>
            <div className="help-raw-html">
              {/* `<ul>`, not the `<ol>` the chunk's template uses. The template is an
                  ordered list but the live page renders bullets, so the numbering is
                  suppressed somewhere in the `.help-center-box` stylesheet that could not be
                  recovered. Matching what renders. */}
              <ul>
                {SELF_ASSESSMENT.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
              <p>{SELF_ASSESSMENT.reminder}</p>
            </div>
          </div>
        ) : (
          /* Gambling Limits, Self-exclusion and Budget Calculator are INTERACTIVE components
             in the remote — a limits form, a self-exclusion form with a confirmation flow, and
             a calculator widget — not prose, so they cannot be transcribed the way this one
             was. They route correctly and render their label until built. */
          <div className="p-4 text-secondary">{topic?.label}</div>
        )}
      </>
    );

  if (isDialog) {
    return <MobileResponsible active={active}>{paneContent}</MobileResponsible>;
  }

  return (
    /* The rendered DOM's own structure, and it replaces a stack of guesses.
     *
     * `page-main flex flex-wrap gap-x-4` with the heading as a `w-full` flex item, so the rail
     * and the pane wrap onto the second line. NO `-mt-3` on the root: the original keeps the
     * layout's 12px (`--header-mb`) and pins on top of it at 72, rather than cancelling it. */
    /* No bottom padding, down from `pb-4`. What is left to the footer is `.footer-bg`'s own
       1rem top margin (Footer.css) — this build's addition, not the original's, which butts the
       footer straight against the content. Trimmed here rather than there because that margin is
       shared by every route and the other pages are already tuned against it; to go tighter than
       16px it has to move to Footer.css and every page moves with it. */
    <div className="page-main flex flex-wrap gap-x-4">
      {/* The heading is a sticky WRAPPER around a `<label>`, and the pair does something a
       * single element cannot. The wrapper pins at `--offsetTop: 72px` — the header's 60 plus
       * `--header-mb`'s 12, i.e. exactly where the content starts. The label then carries
       * `-mt-8 pt-8`, pulling its box 32px higher while pushing the text back down by the same
       * 32, so its `bg-layer2` fill covers the strip ABOVE the text that the wrapper alone
       * would leave transparent. `w-60` is why the rail covers it exactly: both are 240px.
       *
       * `leading-8` (32px), not the `leading-none` this had — that was mine, and it is what
       * made every offset below need re-deriving. The arithmetic now closes: label top at
       * 72-32=40, height 32+32+16=80, so it ends at 120, plus the wrapper's `pb-4` = 136,
       * which is the rail's own pin offset. */}
      <div className="sticky top-18 z-10 w-full text-lg font-extrabold leading-8 pb-4">
        <label className="-mt-8 block w-60 bg-layer2 pb-4 pt-8">Responsible Gambling</label>
      </div>

      {/* `self-start` is required, not decoration: a stretched flex item is full-height and
          sticky has nothing to travel within. `top-34` is 136px — where the heading wrapper
          ends, so the two never overlap while both are pinned. */}
      <nav className="page-menu sticky top-34 z-20 h-fit w-full flex-none self-start rounded-xl bg-layer4 p-2 text-secondary lg:w-60">
        {TOPICS.map((t) => (
          <Link
            key={t.id}
            to={t.href}
            replace
            /* Inactive rows are `btn-like` — the site's shared hover/press treatment — and
               carry no colour or weight of their own; they inherit `text-secondary` from the
               nav. Only the active row names both. */
            className={`h-10 rounded-lg flex items-center gap-1 px-4 ${
              t.id === active
                ? 'font-extrabold text-primary active-tab-group'
                : 'btn-like font-semibold'
            }`}
          >
            <ResponsibleIcon id={t.id} className="icon size-5 flex-none" />
            <span className="overflow-hidden whitespace-nowrap">{t.label}</span>
          </Link>
        ))}
      </nav>

      {/* `w-96 min-h-96` on the outer, `bg-layer4` on an inner wrapper — the card colour is one
          level in, not on the flex child. `w-96` is a flex BASIS here, not a width. */}
      <div className="page-container w-96 min-h-96 min-w-0 flex-1 rounded-xl">
        {/* Two rows bring their own card wrappers, so they render straight into the container
            rather than inside the single `bg-layer4` box a document row gets — see SELF_CARDED.
            Self-exclusion additionally takes the "Need Help?" column beside it. */}
        {active === 'self-exclusion' ? (
          <div className="flex flex-col items-start gap-4 xl:flex-row">
            {paneContent}
            <NeedHelp />
          </div>
        ) : SELF_CARDED.includes(active) ? (
          paneContent
        ) : (
          <div className="rounded-xl bg-layer4">{paneContent}</div>
        )}
      </div>
    </div>
  );
}
