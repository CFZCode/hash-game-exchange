import { useState, useMemo, useRef, useCallback } from 'react';
import useDialogScrollLock from '../../../hooks/useDialogScrollLock';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import useSheetDrag from '../../../hooks/useSheetDrag';
import { useSession } from '../../../context/session';
import { LANGUAGES } from './languages';

const CURRENCIES = [
  { code: 'NONE', name: 'None', symbol: '★', bg: '#6b7280' },
  { code: 'USD', name: 'USD', symbol: '$', bg: '#059669' },
  { code: 'BRL', name: 'BRL', symbol: 'R$', bg: '#10b981' },
  { code: 'INR', name: 'INR', symbol: '₹', bg: '#d97706' },
  { code: 'EUR', name: 'EUR', symbol: '€', bg: '#2563eb' },
  { code: 'RUB', name: 'RUB', symbol: '₽', bg: '#dc2626' },
  { code: 'NGN', name: 'NGN', symbol: '₦', bg: '#059669' },
  { code: 'IDR', name: 'IDR', symbol: 'Rp', bg: '#e11d48' },
  { code: 'BDT', name: 'BDT', symbol: '৳', bg: '#0d9488' },
  { code: 'PKR', name: 'PKR', symbol: 'Rs', bg: '#15803d' },
  { code: 'ARS', name: 'ARS', symbol: '$', bg: '#0ea5e9' },
  { code: 'CLP', name: 'CLP', symbol: '$', bg: '#b91c1c' },
  { code: 'MXN', name: 'MXN', symbol: '$', bg: '#047857' },
  { code: 'PEN', name: 'PEN', symbol: 'S/', bg: '#dc2626' },
  { code: 'COP', name: 'COP', symbol: '$', bg: '#f59e0b' },
  { code: 'VND', name: 'VND', symbol: '₫', bg: '#dc2626' },
  { code: 'THB', name: 'THB', symbol: '฿', bg: '#1d4ed8' },
  { code: 'MYR', name: 'MYR', symbol: 'RM', bg: '#ca8a04' },
  { code: 'KRW', name: 'KRW', symbol: '₩', bg: '#4f46e5' },
  { code: 'JPY', name: 'JPY', symbol: '¥', bg: '#be123c' },
  { code: 'AUD', name: 'AUD', symbol: '$', bg: '#2563eb' },
  { code: 'CAD', name: 'CAD', symbol: '$', bg: '#dc2626' },
  { code: 'GBP', name: 'GBP', symbol: '£', bg: '#9333ea' },
  { code: 'KES', name: 'KES', symbol: 'KSh', bg: '#047857' },
  { code: 'ZAR', name: 'ZAR', symbol: 'R', bg: '#d97706' },
  { code: 'GEL', name: 'GEL', symbol: '₾', bg: '#ef4444' },
  { code: 'TRY', name: 'TRY', symbol: '₺', bg: '#dc2626' },
  { code: 'EGP', name: 'EGP', symbol: 'E£', bg: '#b45309' },
];

/* The combined panel's two tabs, in the registration's own order. Both labels are the strings the
   single-purpose popups carry as their titles, which is what says the strip is the same two
   dialogs rather than a third thing. */
const TABS = [
  { key: 'language', label: 'Language' },
  { key: 'currency', label: 'View in currency' },
];

export default function LanguageCurrencyModal({
  isOpen,
  onClose,
  initialTab = 'language',
  merged = false,
}) {
  /* `merged` IS THE THIRD ENTRY POINT, `open-lanfiat`, and `initialTab` means two different things
     either side of it: which single-purpose dialog this is when false, which TAB the combined one
     opens on when true. See the note below the currency table for how the two were told apart. */
  const [tab, setTab] = useState(initialTab);
  const kind = merged ? tab : initialTab;
  const [needle, setNeedle] = useState('');
  const [focused, setFocused] = useState(false);

  /* THE CHOICE LIVES IN THE ACCOUNT, not in this component, and that is the whole of what was
     wrong before: both selections were `useState` seeded with a literal, so a pick survived until
     the dialog closed and the row above it never changed.
     ---------------------------------------------------------------------------------------
     `setting.lang` and the `enableLocaleCurrency` / `localeCurrencyName` pair are the original's
     own fields — `I("setting", key, value)` is what every preference in the shell is written
     with — and they are already persisted by `SessionProvider`, so a pick now survives a reload
     as it does on the live site.

     THE CURRENCY PAIR IS TWO FIELDS FOR ONE CONTROL, and "None" is the reason: `printCurrency`
     reads `enableLocaleCurrency ? localeCurrencyName : currency`, so the None row is the switch
     going off rather than a currency called none. That is also why picking anything else turns
     conversion ON across the whole shell — which is exactly what the dialog's own blurb promises
     ("The Currencies will be shown in approximated values"). */
  const { session, setSetting } = useSession();
  const { lang, enableLocaleCurrency, localeCurrencyName } = session.setting;
  const overlayerRef = useRef(null);

  /* A PHONE GETS A BOTTOM SHEET, AND THAT IS THE POPUP MANAGER'S DEFAULT RATHER THAN A CHOICE.
     `cl` picks with `n = () => mobile ? t.type : "center"` and `r = L(() => n() !== "center")`, so
     a popup that names no `type` — and `open-language` / `open-fiat` name none — is a sheet below
     the device line and a centred card above it. This panel was written as `pop-center` at every
     width, which is why it appeared rather than rose.

     `.pop-bottomsheet` brings the slide with it: its own `pop-sheet-in` keyframe is the manager's
     `translate3d(0, (1-i())*100%, 0)` over the same 0.35s quartic ease the scrim reads, so the
     panel and its backdrop cannot drift apart. `components/shared/PopCenter` takes the identical
     branch — this modal predates it and still writes its own markup. */
  const isDesktop = useIsDesktop();

  /* `Vx` again — the manager binds it to any panel that is not `.pop-center`, which is exactly the
     sheet arm below. See `hooks/useSheetDrag`; it was `PopCenter`'s until this became its second
     consumer. */
  const { panelRef, handlers } = useSheetDrag({ enabled: !isDesktop, onClose });

  /* THERE IS NO TAB STRIP, AT EITHER WIDTH, AND THE EARLIER NOTE HERE WAS A MISREADING.
     ---------------------------------------------------------------------------------------
     It said the strip was the desktop card's — that `LanAndFiat-CGuGLNxr.js` was what a wide
     viewport got and the two single-purpose modules were the phone's. `Enter-MsmOuq5R.js` settles
     it, and it is three EVENTS rather than a breakpoint:

       "open-language": le.push(() => r(xt, { title: () => y("Language"),
                                              children: <div class="px-3 pt-4">{Language}</div> }))
       "open-fiat":     le.push(() => r(xt, { title: () => y("View in currency"),
                                              children: {ViewinFiat} }))
       "open-lanfiat":  … merge: !0, title: a tab strip …

     So the combined panel is real, and it is what `open-lanfiat` pushes — a THIRD entry point,
     not the wide arm of the other two. `open-language` and `open-fiat` are single-purpose popups
     with a plain centred title at every width, which is what the reference captures show.

     TWO OF THE FOUR TRIGGERS EMIT `open-lanfiat`, AND AN EARLIER NOTE HERE SAID NONE DID. That
     was a misreading, and the correction is worth keeping because of how it was reached: the
     claim "nothing emits it" was made from `Enter-MsmOuq5R.js` alone, which is where all three
     events are HANDLED. Grepping the rest of the mirror for the emitters settles it in one line —

       open-lanfiat    Header-CTF5n6al.js, index-DuwOs_Mv.js      the header and the sidebar
       open-language   Enter only (handler)                       emitted by the account remote
       open-fiat       Enter only (handler)                       emitted by the account remote

     — and the remote's two chunks confirm the other half: `index-BgFc4GKH.js` (the Preferences
     pane) and `Enter-LgsyJFjc.js` (`/user/enter`) each emit `open-language` and `open-fiat` and
     never `open-lanfiat`. So the split is by TRIGGER and not by width:

       header, sidebar          the COMBINED panel, tabbed
       Preferences, /user/enter single-purpose popups with a plain centred title

     The header's own call sites are `g.emit("open-lanfiat", 0)` on the language button and
     `("open-lanfiat", 1)` on the currency row; the sidebar's two rows are the same pair. So the
     ARGUMENT IS THE STARTING TAB rather than a different dialog, which is exactly what
     `initialTab` carries here.

     The combined panel's own registration, verbatim in shape:

       "open-lanfiat": () => e => {
         const [n, t] = S(Pe.isFiat ? 0 : e || 0);
         le.push(() => r(xt, { merge: !0,
           title: () => r(_e, { value: n(), onChange: t, type: "indicator", divider: !0,
             class: "h-10 w-full !rounded-tl-md !rounded-tr-md bg-layer2 sm:h-14 [&_.tabs-btn-group]:px-12",
             children: [ r(_e.TabItem, { title: y("Language"), class: "mt-0" }),
                         r(D, { when: !Pe.isFiat, children: r(_e.TabItem, { title: y("View in currency"), class: "mt-0" }) }) ] }),
           children: <Show when={n()} fallback={<LanguagePanel/>}><CurrencyPanel/></Show> }))
       }

     `Pe.isFiat` is the deploy flag App.jsx already records as never firing here, so both tabs
     render and the emitted argument is the whole of the starting tab. `class: "mt-0"` on each
     `TabItem` belongs to the CONTENT PANEL rather than the button — the trap CLAUDE.md names —
     and there is nothing to put it on here, since the panels are siblings of the strip. */
  /* Both strings are the registrations' own: `open-language` pushes `title: y("Language")` and
     `open-fiat` pushes `y("View in currency")`, and the combined strip labels its two tabs with
     the same pair. */
  const title = kind === 'language' ? 'Language' : 'View in currency';

  /* Registers with the shared popup list while open. Note this sits ABOVE the `if (!isOpen)`
     early return — a hook cannot be called conditionally, and the registry takes the flag
     rather than the caller gating the call. */
  useDialogScrollLock(isOpen);

  /* OPENING RESETS THE TAB AND THE SEARCH — the dialog stays mounted across the closed state
     (the early return below is a render guard, not an unmount), so without this it would reopen
     showing whatever the last visitor left in the field, and on whichever tab they last used
     rather than the one the caller asked for. `initialTab` is the whole of which sheet a phone is
     looking at, since the strip that would let you switch is desktop-only.

     ADJUSTED DURING RENDER rather than in an effect — the "adjust state when a prop changes"
     pattern React documents, which is what `react-hooks/set-state-in-effect` steers towards, and
     the same shape `App`'s background-location tracking uses. As an effect it was a second commit:
     the panel painted once on the old tab with the old query before correcting itself.

     The tracked key is `initialTab` WHILE OPEN and `null` while closed, which reproduces the
     effect's dependency list exactly: it fires on each open, and again if a caller changes
     `initialTab` on an already-open dialog. */
  const openKey = isOpen ? initialTab : null;
  const [lastOpenKey, setLastOpenKey] = useState(openKey);
  if (lastOpenKey !== openKey) {
    setLastOpenKey(openKey);
    if (isOpen) {
      setNeedle('');
      /* The combined panel opens on the tab the trigger asked for, every time — its own signal is
         seeded `S(Pe.isFiat ? 0 : e || 0)` at push time, and it is pushed fresh on each emit. */
      setTab(initialTab);
    }
  }

  /* SWITCHING TABS CLEARS THE SEARCH, because on the original the two panels are separate
     components with their own field: `<Show when={n()} fallback={<LanguagePanel/>}><CurrencyPanel/>`
     unmounts one and mounts the other, so a query typed on one side cannot survive to the other.
     This build renders both lists from one `needle`, so it has to say so. */
  const pickTab = (next) => {
    setTab(next);
    setNeedle('');
  };

  const filteredLanguages = useMemo(() => {
    const q = needle.toLowerCase().trim();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter((l) => l.name.toLowerCase().includes(q));
  }, [needle]);

  const filteredCurrencies = useMemo(() => {
    const q = needle.toLowerCase().trim();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [needle]);

  /* Close on overlay click (but not on modal click) */
  const handleOverlayClick = useCallback(
    (e) => {
      if (e.target === overlayerRef.current) onClose();
    },
    [onClose],
  );

  if (!isOpen) return null;

  return (
    /* ──────── Overlay ──────── */
    <div
      ref={overlayerRef}
      className="pop-overlayer"
      /* Not a stylesheet value on the original either — the `.pop-overlayer` ref callback in
         index-BsFv7ByC.js writes it inline as `rgba(16, 18, 18, ${a() * .8})`, where `a()` is
         the dialog's open progress. This is the same stack RegionBlock rides on, so it is the
         same scrim: #101212 at 80%, not the black at 60% that stood here. See RegionBlock.css
         for the tween, which this one does not (yet) reproduce. */
      style={{ visibility: 'visible', backgroundColor: 'rgba(16, 18, 18, 0.8)' }}
      onClick={handleOverlayClick}
    >
      {/* ──────── Modal ──────── */}
      <div
        ref={panelRef}
        {...handlers}
        /* The original writes `bg-layer3 dark:bg-layer2` (index-BsFv7ByC.js, the `pop-center`
           branch). This build is dark-only and Tailwind v4 has no class-based `dark` variant
           configured, so `dark:` would resolve against prefers-color-scheme and leave the
           panel at layer3 (#292D2E) on a light-scheme machine while the original renders
           layer2 (#232626). Same convention as Auth: drop the variant, keep the dark value. */
        className={`bg-layer2 ${
          isDesktop ? 'pop-center' : 'pop-bottomsheet'
        } h-full sm:h-3/4 pt-16 sm:pt-14 [&_.pop-close]:top-4 [&_.pop-title]:h-14 [&_.pop-title]:flex-col sm:[&_.pop-title]:flex-row`}
        /* The inline pair is the manager's END STATE, written because nothing here tweened it.
           It stays on the centred card and comes OFF the sheet: an inline `transform` is in the
           author origin, and while `pop-sheet-in` runs the animation origin beats it — but the
           moment the animation finishes the declaration snaps the panel back to `scale(1)`, which
           is a visible jolt at the end of a slide that has nothing to do with scale. */
        style={isDesktop ? { opacity: 1, transform: 'scale(1)' } : { opacity: 1 }}
      >
        {/* ── Pop Title (absolute header) ── */}
        <div className="pop-title">
          {/* `Kx` — the manager's MOBILE title, and its first child is this bar:

                <div class="flex flex-col w-full">
                  <div class="w-11 h-1 rounded-sm bg-layer6 mx-auto mb-2.5"></div>
                  <div class="text-center">{title}</div>

              It is the affordance for the drag, and the two arrived separately here — the gesture
              went in first and the sheet then had no sign it could be dismissed at all, since the
              cross had gone with it. Verbatim except for what sits under it: `Kx`'s second row is
              a centred title where this panel's is its tab strip, which is why `.pop-title` grows
              to 4.5rem and turns into a column below `sm` rather than staying a 3.5rem row.

              `touch-action: none` scoped HERE and not to the panel, which is `PopCenter`'s own
              call: a drag starting over the content is safe without it — the scroller is already
              at its top or the gesture never arms — but a drag starting on the bar has no such
              guarantee, and a phone would claim the pointer for a page pan mid-gesture. On the
              panel it would kill scrolling inside the list. */}
          {!isDesktop && (
            <div
              className="mx-auto mb-2.5 h-1 w-11 flex-none rounded-sm bg-layer6"
              style={{ touchAction: 'none' }}
            />
          )}
          {/* ONE CENTRED TITLE AT EVERY WIDTH. `Kx`'s second row is a centred title on a phone,
              and `xt`'s desktop header is `title` beside a `.pop-close` — with the strip gone the
              two are the same element, so the branch that used to pick between them has gone with
              it. `font-extrabold` is the popup title's own weight, which the tab buttons had been
              supplying through `.tabs-btn`. */}
          {merged ? (
            /* THE TAB STRIP IS THE POPUP'S TITLE — `title: () => r(_e, {…})` rather than a string,
               which is why `.pop-title` is sized for a 56px strip by the panel's own class list
               (`pt-16 sm:pt-14`, `[&_.pop-title]:h-14`, `[&_.pop-close]:top-4`). Those were tuned
               when this strip last existed and left in place when it was removed, so they need no
               change now that it is back; the note at `.pop-title` in index.css records what
               breaks when they are wrong.

               The class list is the chunk's, with `rounded-tl-md`/`rounded-tr-md` keeping the
               strip inside the panel's own top corners. `data-divider` is `divider: !0` — the
               hairline the indicator slides on top of. */
            <div
              role="tablist"
              data-type="indicator"
              data-divider=""
              className="tabs-title h-10 w-full !rounded-tl-md !rounded-tr-md bg-layer2 sm:h-14 [&_.tabs-btn-group]:px-12"
              /* The same two custom properties every indicator strip here sets, and the same
                 percentage form the auth dialog documents: the bar is one tab wide and moves by
                 its own width, so nothing has to be measured and it survives a resize. */
              style={{
                '--tabs-width': `${100 / TABS.length}%`,
                '--tabs-indicator-position': `${TABS.findIndex((t) => t.key === kind) * 100}%`,
              }}
            >
              <div className="tabs-btn-group">
                {TABS.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    role="tab"
                    className="tabs-btn btn-like"
                    aria-selected={kind === entry.key ? 'true' : undefined}
                    onClick={() => pickTab(entry.key)}
                  >
                    <span className="text-sm font-extrabold">{entry.label}</span>
                  </button>
                ))}
              </div>
              <div className="tabs-indicator" />
            </div>
          ) : (
            <div className="text-center text-base font-extrabold">{title}</div>
          )}
          {/* NO CROSS ON THE SHEET, and that is `cl`'s own arm rather than a preference: its phone
              branch renders `Kx` — a drag handle over a centred title — and draws no close button
              at all, where the desktop branch renders the title beside a `.pop-close`. A sheet is
              dismissed by dragging it down or tapping the scrim; the cross belongs to the card.
              `PopCenter` takes the identical branch one file over. */}
          {isDesktop && (
          <button
            className="button button-m pop-close !p-0"
            type="button"
            onClick={onClose}
          >
            <svg viewBox="0 0 32 32" className="icon">
              <path d="M7.15445 7.40846C6.3734 8.18951 6.3734 9.45584 7.15445 10.2369L12.9175 15.9999L7.15445 21.7629C6.3734 22.544 6.3734 23.8103 7.15445 24.5914L7.40846 24.8454C8.18951 25.6264 9.45584 25.6264 10.2369 24.8454L15.9998 19.0825L21.7631 24.8458C22.5441 25.6269 23.8104 25.6269 24.5915 24.8458L24.8455 24.5918C25.6265 23.8108 25.6265 22.5444 24.8455 21.7634L19.0825 16.0003L24.8455 10.2373C25.6265 9.45627 25.6265 8.18994 24.8455 7.40889L24.5915 7.15488C23.8104 6.37383 22.5441 6.37383 21.7631 7.15488L16.0002 12.9177L10.2369 7.15445C9.45584 6.3734 8.18951 6.3734 7.40846 7.15445L7.15445 7.40846Z" />
            </svg>
          </button>
          )}
        </div>

        {/* ── Scrollable Content ── */}
        <div className="scroll-y pop-content flex-1 overflow-y-auto">
          <div className="scroll-container">
            <div className="px-3 pt-4">
              <div dir="ltr" className="contents" data-remote-ltr="">

                {/* The blurb leads the currency tab — it sits ABOVE the search field on the
                    original, not between the field and the list. It scrolls away; only the
                    search field is sticky. */}
                {kind === 'currency' && (
                  /* `text-primary` is the token for #ffffff — the @theme block is the single
                     source of truth for colour, so no literal here.

                     12px of air above and below, and neither number is written as 12px:
                       above — the shell wrapper's `pt-4` is 16px and is the ORIGINAL's own
                               (`<div class="px-3 pt-4">`, verbatim from Enter-MsmOuq5R.js), so
                               it is left alone and `-mt-1` takes 4px back off it here.
                       below — the sticky wrapper's `py-3` already IS 12px, so the blurb wants
                               no bottom margin at all; adding one only ever overshoots. */
                  <p className="-mt-1 text-sm leading-normal text-primary">
                    Select the desired currency to display. The Currencies will be shown in
                    approximated values.
                  </p>
                )}

                {/* Sticky Search. `-mt-4` cancels the wrapper's `pt-4` so the field starts at
                    the top of the scroller — but only on the Language tab, where it IS the
                    first thing in the scroller. On the currency tab the blurb has already
                    consumed that padding. */}
                <div
                  className={`sticky top-0 z-10 w-full bg-layer2 py-3 ${
                    kind === 'language' ? '-mt-4' : ''
                  }`}
                >
                  {/* No height utility. `h-11` was pinning the field at 2.75rem and beating
                      `.input`'s own `.pc` height — a utility always outranks the layered
                      primitive — so it stayed a phone-sized field on desktop. Left to the
                      primitive it is 3rem below lg and 2.5rem above, which is the original. */}
                  <div className="input" {...(focused ? { 'data-focus': '' } : {})}>
                    <input
                      placeholder="Search"
                      value={needle}
                      onChange={(e) => setNeedle(e.target.value)}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                    />
                    <svg viewBox="0 0 32 32" className="icon order-first mr-2 size-6 fill-tertiary">
                      <path d="M20.6269 21.5678L19.3527 20.2936C17.8403 21.5314 15.9082 22.2749 13.8023 22.2774C8.95471 22.2774 5.02441 18.3471 5.02441 13.4996C5.02441 8.65197 8.95471 4.72168 13.8023 4.72168C18.6499 4.72168 22.5802 8.65197 22.5802 13.4996C22.5776 15.5902 21.8443 17.5095 20.6235 19.0169L21.9003 20.2936L21.8714 20.3216L21.8825 20.3123C22.158 20.0936 22.5598 20.1122 22.815 20.3665L27.2599 24.8114C27.5337 25.0853 27.5337 25.5304 27.2599 25.805L26.1307 26.9343C25.8568 27.2081 25.4117 27.2081 25.1371 26.9343L20.6922 22.4894C20.4378 22.235 20.4192 21.8332 20.6379 21.5568L20.6269 21.5678ZM13.8023 6.82332C10.1153 6.82332 7.12605 9.81258 7.12605 13.4996C7.12605 17.1865 10.1153 20.1758 13.8023 20.1758C17.4893 20.1758 20.4785 17.1865 20.4785 13.4996C20.4751 9.81343 17.4884 6.82671 13.8023 6.82332Z" />
                    </svg>
                  </div>
                </div>

                {/* List Items */}
                <div className="-ml-4 -mr-4 px-4 pb-4">
                  {kind === 'language' ? (
                    filteredLanguages.map(({ code, name: langName }) => {
                      const isSelected = lang === code;
                      return (
                        <div
                          key={code}
                          className="radio select-item btn-like cursor-pointer"
                          aria-selected={isSelected || undefined}
                          /* PICKING A LANGUAGE RELOADS THE PAGE; PICKING A CURRENCY DOES NOT.
                             That asymmetry is the live site's and it follows from what each one
                             changes. A currency is read at format time — `printCurrency` consults
                             the store on every render — so a re-render is the whole of what it
                             needs. A language decides which translation bundle is COMPILED IN,
                             and the site swaps it by loading the document again; nothing short of
                             that can re-run the strings already rendered.

                             `location.reload()` rather than a router navigation, because a
                             client-side navigation is exactly what would not re-read the bundle.
                             The write lands first: `setSetting` goes through the provider's
                             effect, which is synchronous with the state update, and the record is
                             in localStorage before the document is thrown away.

                             This build ships one locale, so the reload proves the mechanism and
                             changes only the name in the row. Kept anyway — it is the behaviour
                             being reproduced, and the day a second bundle exists this is already
                             the line that would have to be here. */
                          onClick={() => {
                            setSetting('lang', code);
                            onClose();
                            window.location.reload();
                          }}
                        >
                          {/* 16px, measured off the original. `text-base` has to be explicit:
                              `.select-item` declares no font-size, and the inherited base is
                              NOT 1rem — `.app-root` sets .875rem (the original's own rule), so
                              dropping the size utility leaves the row at 14px rather than
                              taking it to 16. Same on both tabs. */}
                          <span className="text-base font-semibold">{langName}</span>
                        </div>
                      );
                    })
                  ) : (
                    filteredCurrencies.map((curr) => {
                      /* NONE is the switch being OFF rather than a currency, so it cannot be
                         compared by code — with conversion off there is no selected currency at
                         all, and `localeCurrencyName` still holds whatever was last chosen. */
                      const isSelected =
                        curr.code === 'NONE'
                          ? !enableLocaleCurrency
                          : enableLocaleCurrency && localeCurrencyName === `${curr.code}FIAT`;
                      return (
                        <div
                          key={curr.code}
                          className="radio select-item btn-like cursor-pointer"
                          aria-selected={isSelected || undefined}
                          onClick={() => {
                            if (curr.code === 'NONE') {
                              setSetting('enableLocaleCurrency', false);
                            } else {
                              /* The store keys fiats with the suffix — `USDFIAT`, not `USD` —
                                 which is what `printCurrency` and the rate table both look up. */
                              setSetting('localeCurrencyName', `${curr.code}FIAT`);
                              setSetting('enableLocaleCurrency', true);
                            }
                            onClose();
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {/* INVENTED. The original serves these as remote artwork from
                                imgxcut.com/coin/<CODE>.rect.png and the mirror saved only
                                five of them (USD, INR, IDR, KES, PHP), so every row would
                                need a network round-trip that does not exist here. A tinted
                                disc with the currency's own symbol is the stand-in — same
                                24px circle, same position, drawn rather than fetched. */}
                            <div
                              className="flex size-6 items-center justify-center rounded-full text-[0.625rem] font-black leading-none text-white"
                              style={{ backgroundColor: curr.bg }}
                            >
                              <span>{curr.symbol}</span>
                            </div>
                            <span className="text-base font-semibold">{curr.name}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
