import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../../context/session';
import { useResource } from '../../hooks/useResource';
import { getRewards } from '../../services/rewards';
import { groupRewards } from './bonus';
import Rewards from './Rewards';
import Vip from './Vip';
import * as icons from './icons';
import { IconArrow } from '../../components/shared/icons';
import './Bonus.css';

/* The Bonus page — `/bonus`, the second of the two sidebar rows that only appear once you are
 * signed in, and the sibling of the Quest Hub built beside it.
 *
 * ROUTE. `Enter-MsmOuq5R.js`: `{path: "/bonus", component: c(() => L.BonusV5Page()), info:
 * {guards: [() => b.login ? !1 : "/"], dialog: m.mobile ? {behavior: "no-title"} : !1}}` — the
 * same pair the quest route carries — except that this one's `dialog` is an object rather than a
 * bare flag. Both halves are reproduced now: the guard below, and the device test in App.jsx,
 * which mounts Dialog.jsx instead of this page below lg.
 *
 * CHUNKS. `bonus-v5-page-dF3gugl8.js` for the page and `index-CUb2-xA-.js` (166 KB) for the
 * reward registry, plus `row-group`, `redeem`, `use-claim-all`, `claimable-item-detail`,
 * `welcome-shield`, `error-fallback`, `empty-placeholder` and four icon chunks — all off
 * `hash.game/assets/`, none in the mirror. So nothing on this page is read off a screenshot.
 *
 * BOTH LAYOUTS ARE BUILT NOW. `k.mobile ? Te : ke` — a DEVICE test, read as the 1024 line like
 * every other one here. `ke` is the side-by-side pair of cards; `Te` is a two-tab strip
 * (Rewards / VIP) over the same two panels, and it is what the phone captures show. The two
 * share `Rewards` and `Vip` untouched — the panels are the same components on the original too,
 * handed to whichever layout as `e.rewards` / `e.vip` — so only the frame around them differs
 * and nothing about the desktop arm moved to build the mobile one.
 *
 * The mobile arm is a DIALOG, not a page: see Dialog.jsx and the `no-title` note there.
 *
 * THE PAGE REPAINTS THE APP BACKGROUND, and that is the original's own rather than a layout
 * accident: `Me` ships an inline `<style>` element setting `.app-root { background-color:
 * rgb(var(--layer1)) !important }`, so /bonus is a step darker than every other route and the
 * two cards' layer2 fill reads as raised against it. Reproduced with the same mechanism — a
 * style tag inside the page, so it unmounts with the page and nothing has to undo it.
 *
 * `pt-st` is `padding-top: var(--safe-top)`, which is 0 outside a Telegram mini-app and is
 * written because the original writes it. `--safe-top` is not declared globally in this build
 * (see the note on `--spacing-sh` in the VIP page), so the utility resolves against its own
 * fallback and contributes nothing — same as on a desktop browser there.
 */

/* `n1` — a panel heading. `h-9` with the label in a `size-full` inline-flex is what gives both
   headings the same baseline whatever their glyph. `hasDot` draws a 10px green pip and nothing
   here sets it. */
function PanelHeading({ icon, label }) {
  return (
    <p className="h-9 text-base font-extrabold">
      <span className="inline-flex size-full items-center gap-1 uppercase transition-colors">
        {icon}
        {label}
      </span>
    </p>
  );
}

/* `r1` — the panel itself. Note it is NOT the shared `Card`: same rounded border over layer2,
   but `p-4` with no flex column and no brand variant, and the VIP one paints an inline gradient
   over the fill. */
function Panel({ className = '', style, children }) {
  return (
    <div className={`rounded-xl border border-fourth/5 bg-layer2 p-4 ${className}`} style={style}>
      {children}
    </div>
  );
}

/* `Te` — THE MOBILE LAYOUT, and the two things worth reading it for are both structural.
 *
 * THE BACK ARROW IS THE TAB STRIP'S, NOT THE DIALOG'S. `Te` hands the Tabs component a
 * `tabTitlePrefix`, which `iT` renders as the first child of `.tabs-title`, ahead of
 * `.tabs-btn-group`:
 *
 *   tabTitlePrefix: <Show when={k.mobile}>
 *                     <Button class="-ml-2 size-10 text-secondary" onClick={() => navigate(-1)}>
 *                       <IconArrow class="text-2xl"/>
 *                     </Button>
 *                   </Show>
 *
 * That `Show` is always true here — the layout only renders on a phone — and it is the whole
 * reason the route asks for `behavior: "no-title"`: with the arrow inside the strip there is
 * nothing left for a title bar to hold. The Button gets no size class, which is `ot`'s own rule
 * on a phone (`s = size || !mobile && "m"`), and `text-2xl` does not size the glyph — `.icon` is
 * 2rem and no utility overrides it — so it is written for fidelity and changes nothing.
 *
 * THE EMPTY `.tabs-content` IS REAL AND IT IS 8px OF LAYOUT. The two `TabItem`s carry a title and
 * a class and NO children, and the panels are rendered as the layout's own siblings underneath
 * (`<Show when={l() === 0}>` / `=== 1`). So the Tabs still draws its content box for the selected
 * item — zero-height, but carrying `.tabs-content`'s `margin-top: .5rem`, which is the gap
 * between the strip and the panel. Dropping it as "an empty div" would close that gap.
 *
 * `class` on a `TabItem` belongs to the CONTENT PANEL and not to the button — the fifth page here
 * to need saying — so `!bg-layer1` lands on that same empty box, cancelling its layer4 fill for a
 * box nothing can see through anyway. Written because it is written. */
const TABS = [
  { key: 'rewards', label: 'Rewards', Icon: icons.IconRewards },
  { key: 'vip', label: 'VIP', Icon: icons.IconVipCrown },
];

function MobileLayout({ rewards, vip, onBack }) {
  /* `const [n] = useSearchParams(), [l, i] = createSignal(n.tab === "vip" ? 1 : 0)` — the opening
     tab is a query parameter and is read once, not tracked. */
  const [params] = useSearchParams();
  const [tab, setTab] = React.useState(() => (params.get('tab') === 'vip' ? 1 : 0));

  return (
    <div className="bonus-scope relative flex flex-col bg-layer1 px-4 pb-4">
      {/* `!h-15` over `py-3` is a 60px bar around a 36px strip, and `!rounded-none !bg-layer1`
          undoes what `.tabs-title:not([data-type])` would otherwise give it — this strip sits on
          the page rather than in a track. `z-80` is a real class in the original's stylesheet
          (`.z-80 { z-index: 80 }`), unlike the `w-30` / `h-22` family, so it is kept. */}
      <div
        role="tablist"
        className="scroll-x tabs-title hide-scroll sticky top-0 z-80 !h-15 !rounded-none !bg-layer1 py-3 !opacity-100"
      >
        <button
          type="button"
          aria-label="Back"
          className="button -ml-2 size-10 text-secondary"
          onClick={onBack}
        >
          <IconArrow className="icon text-2xl" />
        </button>

        <div className="tabs-btn-group">
          {TABS.map(({ key, label, Icon }, index) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === index || undefined}
              className="tabs-btn btn-like"
              onClick={() => setTab(index)}
            >
              <span className="center inline-flex size-full items-center gap-1 transition-all">
                <Icon className="icon size-5" />
                {label}
              </span>
            </button>
          ))}
        </div>
        <div className="tabs-indicator" />
      </div>

      <div className="tabs-content !bg-layer1" />

      <div className="bg-layer1">{tab === 0 ? rewards : vip}</div>
    </div>
  );
}

export default function Bonus({ mobile = false, onBack }) {
  const { session } = useSession();

  /* The payload carries three derived timestamps, so it is built at read time and `now` is
     pinned once per mount rather than re-derived on every render — reading the clock during
     render is what `react-hooks/purity` rejects, and re-deriving would also hand `useResource`
     a fresh object each pass. */
  const [now] = React.useState(() => Date.now());
  /* `useResource` reads once per distinct reader and has no refetch, so a claim re-keys the
     reader rather than growing the hook a second mechanism. `now` stays pinned — the three
     derived timestamps in the payload should not jump because money moved. */
  const [reloads, setReloads] = React.useState(0);
  const read = React.useCallback(() => getRewards({ now, reloads }), [now, reloads]);
  const { data: payload, loading } = useResource(read);
  const onClaimed = React.useCallback(() => setReloads((n) => n + 1), []);

  /* `guards: [() => b.login ? !1 : "/"]` — the route's own. A guard returning `false` in that
     router means "no redirect", so the whole of it is: signed out goes Home. */
  if (!session.login) return <Navigate to="/" replace />;

  /* `mobile` reaches the data because one section's SHAPE depends on it — Recurring is a
     connected `row-group` on a phone and a grid of cards on a desktop; see SECTIONS in bonus.js. */
  const sections = groupRewards(payload, { mobile });

  /* The switch is `k.mobile ? Te : ke` on the original and a prop here, because the arm is chosen
     one level up: below lg the route is a dialog, so App mounts Dialog.jsx and it is that file
     which asks for this one. Both arms are handed the identical two panels. */
  if (mobile) {
    return (
      <MobileLayout
        onBack={onBack}
        rewards={<Rewards payload={payload} sections={sections} mobile loading={loading} onClaimed={onClaimed} />}
        vip={<Vip />}
      />
    );
  }

  return (
    /* The chunk has `py-3 pb-10`; the `py-3` half is DROPPED here, and that is a deliberate
       departure. The page's own 12px was stacking on top of `--header-mb`'s 12px and pushing
       both panels a visible step below the header. Trimmed on the page rather than in the
       layout, because `--header-mb` reaches every route while this padding is the only margin
       this page owns — the same trade the referral page's hero made. One word to revert.
       `pt-st` stays and still resolves to nothing: `.pt-st` is
       `padding-top: var(--safe-top)`, which this build does not declare globally (see the
       `--spacing-sh` note on the VIP page), so it contributes 0 exactly as it does on a desktop
       browser there. */
    <div className="bonus-scope flex flex-col gap-4 border-b border-third pb-10 pt-st">
      <style>{`.app-root { background-color: var(--color-layer1) !important; }`}</style>

      <div className="flex items-start gap-3">
        <Panel className="min-w-[22rem] flex-1">
          <PanelHeading
            icon={<icons.IconRewards className="icon size-5 fill-current" />}
            label="Rewards"
          />
          <div className="mt-4">
            <Rewards payload={payload} sections={sections} loading={loading} onClaimed={onClaimed} />
          </div>
        </Panel>

        {/* The gradient is the chunk's own inline style, `-100%` to `20%`, so the brand tint is
            almost entirely off the top of the panel and what shows is a faint wash over layer2.
            `!border-brand/10` is half the strength of the greeting card's border inside it.

            The stops are rewritten for the reason the greeting card's are — see the long note
            there. The chunk's `rgb(var(--brand) / 0.2)` needs a bare RGB triple and this build's
            tokens are hex, so it parsed to nothing and the panel rendered flat. `color-mix` is
            how Tailwind v4 itself spells `brand/20`, so it is the same colour by the same
            route. */}
        <Panel
          className="min-w-[18.75rem] max-w-[26.25rem] shrink basis-[26.25rem] !border-brand/10"
          style={{
            background:
              'linear-gradient(160deg, color-mix(in oklab, var(--color-brand) 20%, transparent) -100%, var(--color-layer2) 20%)',
          }}
        >
          <PanelHeading
            icon={<icons.IconVipCrown className="icon size-5 fill-current" />}
            label="VIP"
          />
          <div className="mt-4">
            <Vip />
          </div>
        </Panel>
      </div>
    </div>
  );
}
