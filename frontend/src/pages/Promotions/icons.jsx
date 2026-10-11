/* The promotions page's own icon, out of its chunk — `index-CMExrEqM.js` off `hash.game/assets/`,
 * which the rest of this project had listed as unrecoverable. It is reached through the router's
 * component registry rather than by guessing a filename: `L.Promotion` is `Aa`, and `Aa` is
 * `() => import("./index-CMExrEqM.js")`. (`schedule-promotions-*.js`, the obvious candidate, is
 * the "Exclusive Promotions" POPUP and not this page.)
 *
 * Inlined in the chunk rather than imported from an `Icon*.js` of its own, so there is no shared
 * module to re-export from. Carries no `fill` for the reason every icon in this project does not
 * — the call site supplies it — and its viewBox is the site's usual 32.
 */
export function IconArchive({ className = '' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M28.0398 24.67C28.0398 26.5699 26.5002 28.1103 24.6003 28.1104H7.40015C5.50024 28.1104 3.95972 26.5699 3.95972 24.67V10.9102H28.0398V24.67ZM16.8103 13.459C16.3511 13.0416 15.6494 13.0417 15.1902 13.459L11.7498 16.587C11.2581 17.0343 11.2217 17.7952 11.6687 18.2872C12.116 18.7792 12.8778 18.8155 13.3699 18.3682L14.7957 17.0723V22.9503C14.7957 23.6151 15.3349 24.1542 15.9998 24.1544C16.6647 24.1544 17.2038 23.6152 17.2039 22.9503V17.0723L18.6306 18.3682C19.1226 18.8153 19.8835 18.7791 20.3308 18.2872C20.778 17.7952 20.7416 17.0343 20.2498 16.587L16.8103 13.459ZM26.6482 10.0499H5.35132L7.9314 4.88971H24.0691L26.6482 10.0499Z" />
    </svg>
  );
}

export default IconArchive;
