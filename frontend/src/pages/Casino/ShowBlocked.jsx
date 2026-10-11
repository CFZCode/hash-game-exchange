/* `Show Blocked` — region-locked titles are hidden by default and this reveals them.
 *
 * TRANSCRIBED FROM THE RENDERED MARKUP, which corrected two things a screenshot rebuild had
 * guessed at:
 *
 *   <div class="flex items-center py-2 pl-2 sm:ml-auto">
 *     <span class="mr-2">Show Blocked</span>
 *     <div class="switch switch-xs bg-input_bright"><div></div></div>
 *
 * The LABEL CARRIES NO TYPE CLASSES AT ALL, so it inherits the body's 14px, weight 400 and
 * `primary` — white. It had been built as `text-sm font-semibold text-secondary`, which is the
 * Sort By / Providers treatment beside it and reads a step dimmer than the live control.
 *
 * `bg-input_bright` IS WHERE THE RESTING FILL COMES FROM, and it is worth understanding because
 * this file used to force it with a rule of its own. `.switch` paints
 * `linear-gradient(black_alpha5, black_alpha5)` over its background COLOUR, so the utility
 * supplies #292D2E and the 5% wash takes it to #272B2C — which is exactly what the live control
 * samples. The old `.casino-show-blocked` rule in Casino.css hit the same colour by setting
 * `background` outright to clear that wash, and its comment had the mechanism backwards: the
 * wash is not something to remove, it is what produces the value. That rule is gone.
 *
 * Nothing in the captured feed carries a blocked flag, so there is no set for it to reveal; the
 * control holds its state and is otherwise inert, which is the same position the Sports and
 * Lottery panels are in. Wire it to the flag the day a response contains one.
 *
 * It lived inside PokerTab.jsx until the filter tabs became a second call site, which is the
 * rule `Select`, `GameTile`, `PageCard` and `Notice` all moved under. It stays in the page
 * directory rather than going to `components/shared` because both consumers are this page.
 *
 * TWO DEPARTURES FROM THAT MARKUP, both forced.
 *
 * The switch is a `<button role="switch">` where the original ships a bare `<div>` — it is the
 * only interactive thing here and a div cannot be reached from a keyboard; `.switch` keys all of
 * its own state off `[aria-checked]`, which the button carries either way.
 *
 * `w-full sm:w-auto` IS THE SECOND, AND IT EXISTS TO CANCEL ANOTHER OF THIS BUILD'S DEPARTURES.
 * This is now the filter row's last child (which is what makes the original's own `sm:ml-auto`
 * live rather than inert), and below `sm` it has to fall onto its own line. On the live site it
 * does so for free: the two selects are `flex-1`, i.e. `flex-basis: 0`, but flex-wrap breaks
 * lines on the HYPOTHETICAL main size — the base clamped by the automatic minimum — and with
 * `min-width: auto` that floor is each pill's min-content width, so two of them plus this
 * overflow a phone and this wraps.
 *
 * This build adds `min-w-0` to those pills, as a horizontal-overflow guard the chunk has no need
 * for (see the note at that call site in FilterBar). That takes the floor to zero, so the
 * hypothetical size really is 0, nothing forces a break, and all three sat on one line — the
 * mobile filter row this component had never shared before. `w-full` restores the break
 * explicitly rather than by relying on intrinsic widths, which is the more robust of the two
 * mechanisms anyway; `sm:w-auto` hands the row back to `ml-auto` from 640 up.
 */
export default function ShowBlocked({ on, setOn, className = '' }) {
  return (
    <div className={`flex w-full items-center py-2 pl-2 sm:ml-auto sm:w-auto ${className}`}>
      <span className="mr-2">Show Blocked</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Show Blocked"
        className="switch switch-xs bg-input_bright flex items-center"
        onClick={() => setOn(!on)}
      >
        <div />
      </button>
    </div>
  );
}
