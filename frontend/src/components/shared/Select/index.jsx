import React from 'react';
import { createPortal } from 'react-dom';
import { layerPosition, scrollParent } from './position';
import PopCenter from '../PopCenter';
import { IconSearch } from '../icons';
import { useIsDesktop } from '../../../hooks/useMediaQuery';

/* The site's two dropdowns — `nO` (Select) and `FA` (MultiSelect) in index-BsFv7ByC.js.
 *
 * Neither is a <select>. Both are a `.button.select` trigger plus a detached
 * `.dropdown-layer` that the original mounts through its popover machinery and positions
 * from JS against the trigger's box. That is why `.dropdown-layer` is
 * `position: fixed; left: 0; top: 0` in the stylesheet with nothing to place it — the
 * coordinates are written inline, and they are written inline here too.
 *
 * They differ only in the layer's contents: Select renders `radio btn-like select-item`
 * rows and commits on click; MultiSelect renders checkbox rows, accumulates an array, and
 * stays open. Everything else — trigger markup, chevron square, placement, dismissal — is
 * shared below.
 *
 * THE BOTTOM-SHEET ARM IS BUILT NOW. `js` — the shell both dropdowns share — ends with
 * `const u = L(() => t.dropdownType ? t.dropdownType === "pop" : ee.mobile)` and renders `CS`
 * when it is true and `wS`, the positioned `.dropdown-layer`, when it is not. `CS` is three
 * lines: push `cl` onto the popup stack with `class="min-h-52 select-options"` and
 * `title = t.title || "Select"`. `cl` is `components/shared/PopCenter`, whose own sheet arm was
 * unreachable until this became its first consumer. So below `lg` every Select on the site
 * opens from the bottom of the screen with a drag handle over a centred title — which is what
 * the casino filter's Sort By and Providers now do.
 *
 * Not reproduced: MultiSelect's `throttle` prop, which defers `onChange` by a second so a burst
 * of ticks is one analytics event. Nothing here is wired to analytics, so the change is applied
 * as it happens.
 */

/* `Te.Arrow`, the site's chevron — points left as drawn, so every call site rotates it. */
const ArrowIcon = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={className}>
    <path d="M19.6912 5.6L9.2912 16L19.6912 26.4L22.7088 23.3824L15.3264 16L22.7088 8.6176L19.6912 5.6Z" />
  </svg>
);

/* The tick, from the auth dialog's checkbox — same markup, because it is the same control.
   The stroked square is the CHECKED border; `.checkbox-ico::before` draws the unchecked one
   and the two cross-fade. See the .checkbox rules in index.css. */
const TickIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" shapeRendering="geometricPrecision">
    <path
      d="M7.77637 0.450195H10.2236C11.592 0.450195 12.592 0.450279 13.3799 0.514648C14.1622 0.5786 14.6969 0.703566 15.1426 0.930664C15.9721 1.35341 16.6466 2.02793 17.0693 2.85742C17.2965 3.30322 17.4214 3.83851 17.4854 4.62109C17.5497 5.40886 17.5498 6.4083 17.5498 7.77637V10.2236C17.5498 11.592 17.5497 12.592 17.4854 13.3799C17.4214 14.1622 17.2964 14.6969 17.0693 15.1426C16.6466 15.9721 15.9721 16.6466 15.1426 17.0693C14.6968 17.2965 14.1615 17.4214 13.3789 17.4854C12.5911 17.5497 11.5917 17.5498 10.2236 17.5498H7.77637C6.4083 17.5498 5.40886 17.5497 4.62109 17.4854C3.83851 17.4214 3.30322 17.2965 2.85742 17.0693C2.02793 16.6466 1.35341 15.9721 0.930664 15.1426C0.70352 14.6968 0.578588 14.1615 0.514648 13.3789C0.450319 12.5911 0.450195 11.5917 0.450195 10.2236V7.77637C0.450195 6.40801 0.450279 5.40796 0.514648 4.62012C0.5786 3.83779 0.703567 3.30313 0.930664 2.85742C1.35341 2.02793 2.02793 1.35341 2.85742 0.930664C3.30322 0.70352 3.83851 0.578588 4.62109 0.514648C5.40886 0.450319 6.4083 0.450195 7.77637 0.450195Z"
      fill="none"
      stroke="var(--color-brand)"
      strokeWidth="1.5"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M14.0382 6.8489L8.53208 12.5169C8.16569 12.8941 7.57165 12.8941 7.20526 12.5169L3.96191 9.1782C4.40027 8.64081 5.14907 7.94804 5.54815 7.60893L7.86867 9.94581C7.86867 9.94581 11.4664 6.12162 12.3331 5.22949C12.7841 5.63746 13.5819 6.31045 14.0382 6.8489Z"
      fill="var(--color-brand)"
    />
  </svg>
);

/* Where the layer sits for the one frame between mounting and being measured. It has to be in
   the DOM to have a height, and it must not be seen at the wrong place while it is — so it is
   rendered hidden, and the layout effect below places it before the browser paints. */
const UNPLACED = { left: 0, top: 0, visibility: 'hidden' };

/* The shared shell: the trigger, its chevron square, and a portalled layer that tracks the
   trigger and closes on outside pointerdown or Escape. `renderLayer` supplies the contents. */
function Dropdown({
  className = '',
  optionsClassName = '',
  size,
  title = 'Select',
  label,
  renderLayer,
  onKeyDown,
  searchable = false,
  disabled = false,
  /* `t.space ?? 8` — the gap between the trigger and the layer, in px. A prop on the original
     too; see the note in position.js. */
  space,
}) {
  /* `s = L(() => t.size || !mobile && "m")` — the size class is the component's job, and the
     fallback is a DEVICE TEST rather than the constant `"m"` this used to default to. A phone
     gets NO size class, so `.button`'s own 3rem applies; a desktop gets `.button-m`'s 2.5rem.

     It defaulted to `"m"` at every width under a note saying the breakpoint served no call
     site — true when it was written, and no longer: `/explore` renders this component below
     `lg`, where the original's filter pills are 48px and ours came out 40. An explicit `size`
     prop still wins at both ends, which is what the search bar's `size="s"` relies on. */
  const isDesktop = useIsDesktop();
  const appliedSize = size ?? (isDesktop ? 'm' : null);

  /* `const u = L(() => t.dropdownType ? t.dropdownType === "pop" : ee.mobile)` in `js`, the
     shell both dropdowns share — the ONE decision that picks between a positioned
     `.dropdown-layer` and a full popup, and it is a device test unless a call site forces it.
     `CS`, the arm it selects, is three lines: push `cl` onto the popup stack with
     `class="min-h-52 select-options"` and `title = t.title || "Select"`. `cl` is `PopCenter`
     here, and on a narrow viewport it renders its bottom-sheet arm — so the filter's Sort By
     and Providers open from the bottom of the screen rather than under their trigger.

     No `dropdownType` prop is offered yet; add it the day a call site needs a sheet on a
     desktop, which is what that first branch exists for. */
  const sheet = !isDesktop;

  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState(null);
  const triggerRef = React.useRef(null);
  const layerRef = React.useRef(null);

  const place = React.useCallback(() => {
    const trigger = triggerRef.current;
    const layer = layerRef.current;
    if (!trigger || !layer) return;
    /* Width MEASURED rather than assumed. `.dropdown-layer` is 18rem by default but a call site
       can override it (`optionsClassName="w-100 …"` on the deposit Currency select, 24rem on the
       header's), and the end-align branch below subtracts that width — so a stale 18rem would put
       the layer 112px off. The original measures it the same way, off the layer's own rect. */
    setPosition(
      layerPosition(
        trigger.getBoundingClientRect(),
        layer.offsetHeight,
        layer.offsetWidth,
        trigger.clientWidth,
        space,
      ),
    );
  }, [space]);

  React.useLayoutEffect(() => {
    /* `sheet` skips ALL of this. There is no layer to measure, nothing to anchor to the trigger,
       and — the part that would actually misbehave — no reason to close on scroll: the sheet is
       fixed to the viewport floor rather than pinned to a trigger that can scroll away. */
    if (!open || sheet) return undefined;
    /* A layout effect, not a plain one: the layer is already in the DOM by the time this runs,
       so it can be measured and placed before the browser paints and the hidden first frame is
       never seen.

       `position` is deliberately NOT cleared on close. Clearing it would be a setState inside
       an effect — a cascading render — and it buys nothing: on the next open the layer renders
       for one commit at the previous coordinates, and this effect re-places it before that
       commit is painted. */
    place();

    /* SCROLLING CLOSES THE LAYER; it does not drag it along. That is the original's own
       behaviour — `qe(() => t.visible ? c() : void 0, "scroll", () => t.setVisible(!1))`,
       where `c()` is `Ni()`, the trigger's NEAREST SCROLLABLE ANCESTOR — and the nearest-
       ancestor part is what makes it usable: bound to the window instead, scrolling the
       provider list inside the layer would close the layer you were reading.

       This used to re-place on every scroll event with `capture: true`. Fixed coordinates do
       go stale, so chasing them looks right in isolation; what it actually produced was a
       layer that slid around under the pointer while the Explore panel's own `.scroll-y`
       moved beneath it. Closing is both simpler and what the site does. */
    const scroller = scrollParent(triggerRef.current);
    const onScroll = () => setOpen(false);
    const onResize = () => place();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [open, place, sheet]);

  React.useEffect(() => {
    if (!open) return undefined;

    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        event.stopPropagation();
        return;
      }
      onKeyDown?.(event, () => setOpen(false));
    };

    document.addEventListener('keydown', onKey);

    /* THE OUTSIDE-CLICK HANDLER IS THE LAYER'S ALONE. It dismisses anything that is not the
       trigger and not inside a `.dropdown-layer` — and the sheet is neither, so with it
       registered the first tap on a coin row closed the sheet before the row's own click could
       fire. The sheet has a scrim for this, which is `PopCenter`'s own and behaves the same
       way. */
    if (sheet) return () => document.removeEventListener('keydown', onKey);

    const onPointerDown = (event) => {
      if (triggerRef.current?.contains(event.target)) return;
      if (event.target.closest?.('.dropdown-layer')) return;
      setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onKeyDown, sheet]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title={title}
        aria-haspopup="listbox"
        aria-expanded={open}
        /* `Y("button", zx[type], s() && \`button-${s()}\`, t.class)` in `ot`, the site's Button,
           over the Select's own `Y("select bg-input_bright", t.class)`. THE SIZE CLASS IS THE
           COMPONENT'S JOB, not the call site's: `s = L(() => t.size || !mobile && "m")`, so
           every trigger on a desktop is `.button-m` unless it asks for something else.

           It was missing here, and three of the five call sites had each re-implemented it —
           `button-m` written by hand on the Help rail, the deposit calculator and its currency
           picker, and `!h-10` on the Explore filters. That last one is why the filter label sat
           low: `!h-10` restores `.button-m`'s 2.5rem but not its `--radius-lg`, and it left the
           call site also reaching for `text-sm`, which pins the label's line box to 20px where
           the original inherits the body's 21px. Both compensations are gone now.

           `size` defaults to `m` rather than reading a media query. The original drops the class
           on a phone — a DEVICE test, so `.button`'s 3rem applies there — but every call site
           here already wanted 40px at every width, and a hook would exist only to serve a
           breakpoint none of them cross. */
        className={`button ${appliedSize ? `button-${appliedSize} ` : ''}select bg-input_bright ${className}`}
        /* `disabled` IS THE ORIGINAL'S OWN PROP, not an addition — the whitelist Add form passes
           `disabled: t.universal` to its Currency select, so ticking "universal address" greys
           the coin picker out rather than hiding it. `button:disabled` in index.css already
           carries the 0.4 opacity and the not-allowed cursor. */
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        {/* A FUNCTION HERE IS HANDED THE OPEN FLAG, because `open` lives in this component and
            two of the original's triggers change with it — the chat drawer's room picker turns
            its label brand and flips its chevron while the layer is up. `Select` wraps
            `labelRender` into one; a plain node still passes straight through. */}
        {typeof label === 'function' ? label(open) : label}
      </button>

      {/* `min-h-52 select-options` is `CS`'s own class list. `select-options` is inert on this
          arm — the only rule for it is `.dropdown-layer.select-options { padding: .5rem }`, and
          there is no `.dropdown-layer` here — but it is what the original writes, so it is
          written. `optionsClassName` deliberately does NOT come along: every call site that
          passes one is sizing a positioned layer (`w-100`, a 24rem header panel, a `min-h`
          floor), and a sheet is full-width against the viewport floor by construction.

          `h-[90%]` IS THE ORIGINAL'S OWN RULE AND IT IS CONDITIONAL ON THE SEARCH BOX —
          `Y("select-options", t.search && ee.mobile && "h-[90%]")` in `nO`. A list you can type
          into is one you are expected to scroll, so its sheet claims the screen instead of
          hugging its rows; a four-option Sort By stays short. Note the height it actually lands
          on is 80%, because `.pop-bottomsheet` carries `max-height: 80%` — so read this as "as
          tall as a sheet is allowed to be", which is true on the original too. */}
      {open && sheet && (
        <PopCenter
          open
          type="sheet"
          title={title}
          onClose={() => setOpen(false)}
          className={`min-h-52 select-options ${searchable ? 'h-[90%]' : ''}`}
        >
          <div role="listbox">{renderLayer(() => setOpen(false))}</div>
        </PopCenter>
      )}

      {open && !sheet && createPortal(
        <div
          ref={layerRef}
          role="listbox"
          style={position || UNPLACED}
          className={`dropdown-layer select-options scroll-y dropdown-enter bg-layer3 ${optionsClassName}`}
        >
          {renderLayer(() => setOpen(false))}
        </div>,
        document.body,
      )}
    </>
  );
}

/* The chevron in its own `bg-input_button` square — the default trigger tail whenever the
   call site does not take the whole label over with `labelRender`. */
function defaultLabel(value, labelFormat, children) {
  return (
    <>
      {(labelFormat || children)(value)}
      <div className="center ms-auto size-6 rounded-md bg-input_button">
        <ArrowIcon className="size-4 -rotate-90 fill-secondary transition-all" />
      </div>
    </>
  );
}

/* `W3` — the layer's contents, and its own component on the original for the reason it is one
 * here: the search box holds state, and `renderLayer` above is called during the shell's render.
 *
 * `search` is a PREDICATE, `(option, term) => boolean`, run over the raw option values. The
 * original filters the already-rendered row list by index (`g.filter((_, b) => m(v[b], y))`),
 * which is the same thing with more steps. It clears the term whenever the layer closes — free
 * here, since the layer unmounts.
 *
 * The empty state is the chunk's own `<div class="center h-48">` with the site's own string.
 */
function SelectOptions({ options, value, onChange, close, search, optionRender, format }) {
  const [term, setTerm] = React.useState('');
  const shown = search ? options.filter((option) => search(option, term)) : options;

  return (
    <>
      {search && (
        /* `eO`. `-mt-2 py-3` cancels the layer's own 8px padding at the top so the bar can be
           flush and sticky; `bg-layer0` is the fill it scrolls the rows under, and it is a
           DARKER layer than the panel it sits on, which is the original's choice. */
        <div className="sticky -top-2 z-30 -mt-2 w-full bg-layer0 py-3">
          {/* `Hd` — the plain Input, whose trailing children slot the magnifier takes with
              `order-first` to sit in front of the field instead. */}
          <div className="input">
            <input value={term} onChange={(event) => setTerm(event.target.value)} />
            <IconSearch className="icon order-first h-6 w-6 fill-tertiary" />
          </div>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="center h-48">Stay tuned—something&apos;s coming!</div>
      ) : (
        shown.map((option, index) => {
          const selected = option === value;
          const commit = () => {
            onChange(option);
            close();
          };

          /* `optionRender` REPLACES the row, it does not fill one — the original binds the click
             to whatever element the render returns (`Fs` + `qe(m, "click", …)`) rather than
             wrapping it. Cloning to attach the handler is that same arrangement; wrapping would
             put a stray box between the layer and a row that sizes itself with `h-12 mb-1`. */
          if (optionRender) {
            return React.cloneElement(optionRender(option, selected), {
              key: index,
              onClick: commit,
            });
          }

          return (
            <button
              key={index}
              type="button"
              role="option"
              className="radio btn-like select-item"
              aria-selected={selected || undefined}
              onClick={commit}
            >
              {format(option)}
            </button>
          );
        })
      )}
    </>
  );
}

export default function Select({
  value,
  options,
  onChange,
  className = '',
  optionsClassName = '',
  size,
  labelRender,
  labelFormat,
  children = (option) => String(option),
  layerRender,
  optionRender,
  search,
  title = 'Select',
  space,
  disabled = false,
}) {
  /* ArrowDown / ArrowUp step through the list and Enter commits, as `W3` does. The cursor is
     the committed value itself rather than a separate signal — with the layer open there is
     nothing else focused, so moving it and committing it are the same gesture. */
  const onKeyDown = React.useCallback(
    (event, close) => {
      const step = (delta) => {
        const index = options.indexOf(value);
        onChange(options[(index + delta + options.length) % options.length]);
        event.preventDefault();
      };
      if (event.key === 'ArrowDown') step(1);
      else if (event.key === 'ArrowUp') step(-1);
      else if (event.key === 'Enter') {
        close();
        event.preventDefault();
      }
    },
    [options, value, onChange],
  );

  return (
    <Dropdown
      className={className}
      optionsClassName={optionsClassName}
      size={size}
      title={title}
      space={space}
      onKeyDown={onKeyDown}
      searchable={Boolean(search)}
      disabled={disabled}
      /* Wrapped rather than called, so `labelRender` is handed the layer's open state as its
         second argument — see the note at the `{label}` slot above. */
      label={
        labelRender ? (open) => labelRender(value, open) : defaultLabel(value, labelFormat, children)
      }
      /* `layerRender` wraps the rows, exactly as it already does on MultiSelect — the provider
         filter uses it there to put a search box above them. The deposit dialog's Currency
         select needs the same thing (`SelectCurrencyContent` in the original is a sticky search
         bar over grouped coin rows), so the hook is lifted onto Select rather than duplicated. */
      renderLayer={(close) => {
        const rows = (
          <SelectOptions
            options={options}
            value={value}
            onChange={onChange}
            close={close}
            search={search}
            optionRender={optionRender}
            format={children}
          />
        );
        return layerRender ? layerRender(rows) : rows;
      }}
    />
  );
}

/* `FA`. `value` is an array; the layer stays open while it is edited. Each row is the
   original's `p-3 rounded-xl mb-1` wrapper turning layer4 when ticked, with a real checkbox
   inside it. `layerRender` wraps the rows — the provider filter uses it to put a search box
   above them and a Clear All below, exactly as the original does. */
export function MultiSelect({
  value,
  options,
  onChange,
  className = '',
  optionsClassName = '',
  size,
  labelRender,
  labelFormat,
  children = (option) => String(option),
  layerRender,
  title = 'Select',
  /* `search` here is a FLAG, not the predicate `Select` takes — MultiSelect's own search box
     lives in the call site's `layerRender` rather than in the component, so only the call site
     can say whether the layer has one. It exists for the same reason `nO`'s does: it is what
     decides whether the mobile sheet claims the screen. */
  search = false,
}) {
  const toggle = (option, checked) =>
    onChange(checked ? [...value, option] : value.filter((item) => item !== option));

  return (
    <Dropdown
      className={className}
      optionsClassName={optionsClassName}
      size={size}
      title={title}
      searchable={search}
      label={labelRender ? labelRender(value) : defaultLabel(value, labelFormat, children)}
      renderLayer={() => {
        const rows = (
          <div className="flex flex-col">
            {options.map((option, index) => {
              const checked = value.includes(option);
              return (
                <button
                  key={index}
                  type="button"
                  role="option"
                  aria-selected={checked}
                  /* `h-auto` because the original keeps the p-3 wrapper and the checkbox as
                     two elements — merged into one here, the padding has to win over
                     `.checkbox`'s fixed 2.75rem (2.5rem at lg). */
                  className={`checkbox btn-like p-3 rounded-xl mb-1 ${checked ? 'bg-layer4' : ''}`}
                  onClick={() => toggle(option, !checked)}
                >
                  <div className="checkbox-ico" {...(checked ? { 'aria-selected': 'true' } : {})}>
                    <TickIcon />
                  </div>
                  {children(option)}
                </button>
              );
            })}
          </div>
        );
        return layerRender ? layerRender(rows) : rows;
      }}
    />
  );
}
