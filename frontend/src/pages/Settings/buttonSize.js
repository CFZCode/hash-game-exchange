import { useIsDesktop } from '../../hooks/useMediaQuery';

/* `ot`'s SIZE DEFAULT, which is a device test rather than a constant:
 *
 *   Y("button", zx[type], s() && `button-${s()}`, t.class)   with   s = size || !mobile && "m"
 *
 * So a `.button` that names no size is `.button-m` — 2.5rem and `--radius-lg` — on a desktop and
 * has no size class at all on a phone, where `.button`'s own 3rem applies. NOT one height: the
 * same button is 40px beside a desktop's `sm:h-10` field and 48px above a phone's stacked one,
 * which is why this is a hook and not a constant appended to a class list.
 *
 * THIS IS THE MISS CLAUDE.md CALLS OUT AS RECURRING — the Select triggers, the referral terms link
 * and `PcNav`'s back button have each been corrected for it, and every button on these six panes
 * had it too: a 48px Change button beside a 40px e-mail field, 48px tiles buttons, a 48px Go.
 * `PcNav` writes the class out flat because it only ever renders where `!mobile`; anything that
 * renders at both widths has to make the test, and these panes do.
 *
 * Call sites that name their own height (`h-8`, `h-10`, `h-12`) are unaffected either way — a
 * utility beats the layered rule — and they still write the class, because the rendered DOM has it.
 */
export function useButtonSize() {
  return useIsDesktop() ? 'button-m' : '';
}
