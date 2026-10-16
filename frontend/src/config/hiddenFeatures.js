/* bc.game features this platform does not offer, switched off in ONE place (user's request,
 * 2026-10-16). The UI for each stays on disk; flipping a flag back to `true` restores every surface
 * listed beside it. The inventory and the rules for adding to it are in
 * `.claude/skills/hidden-features/SKILL.md`.
 *
 *   PASSKEY  the auth dialog's "Sign In with Passkey" button, Settings › Security's Passkey tile,
 *            and the `/settings/passkey` dialog route. The platform has no WebAuthn support. */
export const PASSKEY_ENABLED = false;

/* The social sign-in buttons the auth dialog draws, by label (user's request, 2026-10-16: Google
 * only). bc.game's row is Google, X, Telegram, MetaMask, WalletConnect, LINE, Steam; the others stay
 * defined in components/modals/Auth and come back by adding their label here. With one entry
 * the Sign In row is a single full-width button and Sign Up's "More" toggle is not drawn. */
export const SOCIAL_LOGINS = ['Google'];

/* The fiat currencies the deposit dialog's Fiat tab offers (user's request, 2026-10-16: INR only),
 * intersected with the owner's enabled list. Add a code here to offer another. */
export const DEPOSIT_FIATS = ['INR'];
