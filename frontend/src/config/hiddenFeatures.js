/* bc.game features this platform does not offer, switched off in ONE place (user's request,
 * 2026-10-16). The UI for each stays on disk; flipping a flag back to `true` restores every surface
 * listed beside it. The inventory and the rules for adding to it are in
 * `.claude/skills/hidden-features/SKILL.md`.
 *
 *   PASSKEY  the auth dialog's "Sign In with Passkey" button, Settings › Security's Passkey tile,
 *            and the `/settings/passkey` dialog route. The platform has no WebAuthn support. */
export const PASSKEY_ENABLED = false;
