/* `C` in CommunityItem-DguQXLpB.js — one social link, rendered as a 40px square.
 *
 * EXTRACTED UNDER THE SECOND-CALL-SITE RULE that `Select`, `GameTile` and `PageCard` moved
 * under, and in this case the original agrees rather loudly: it is its own chunk on the live
 * site, imported by the footer and by the sidebar's community card. It lived in
 * `layouts/MainLayout/Footer/index.jsx` while the footer was the only consumer.
 *
 * The chunk's class list is verbatim, BOTH ARMS INCLUDED:
 *
 *   btn-like relative inline-flex size-10 items-center justify-center rounded-lg
 *   bg-[#F7F9FA] p-0 text-secondary shadow-none dark:bg-layer3
 *
 * `#F7F9FA` is the light theme's own `--layer2`, written as an arbitrary value by the chunk
 * rather than as the token — kept as it writes it. Only the dark arm used to be here, back
 * when `dark:` resolved to `prefers-color-scheme` and would have handed a light-OS visitor the
 * `#F7F9FA` half on a dark page; the variant keys off the `.dark` class now.
 *
 * The <li> is the wrapper both call sites put round it, so it lives here rather than being
 * repeated: the footer's `<ul class="grid grid-cols-4 gap-2">` and the sidebar's
 * `<ul class="mt-2 flex items-center justify-between">` both list these directly.
 *
 * `emoji` is the chunk's own optional badge — `<span class="absolute -top-2 right-0 text-lg">`
 * over the square. No entry in this build's set carries one; it is reproduced because it costs
 * a line and is the kind of field a real feed would populate.
 */
export const CommunityItem = ({ label, href, icon, emoji }) => (
  <li>
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="btn-like relative inline-flex size-10 items-center justify-center rounded-lg bg-[#F7F9FA] p-0 text-secondary shadow-none dark:bg-layer3"
    >
      {icon}
      {emoji && <span className="absolute -top-2 right-0 text-lg">{emoji}</span>}
    </a>
  </li>
);

/* hash.game's own mark, a paper plane cut out of a globe — `IconGlobal-lZ7HOX9W.js`. It is not
 * one of the eight in RegionBlock's set (those are the global networks), and it is what BOTH
 * consumers substitute for the eighth entry: the footer prints it alone under "Join Our Local
 * Community", and the sidebar's card swaps it in for the last of the eight. Paths verbatim. */
export const GlobalIcon = () => (
  <svg viewBox="0 0 32 32" className="icon size-6 fill-secondary">
    <path d="M19.4905 21.2051C19.5307 23.5301 20.0518 25.4376 20.8255 26.3711C19.5999 26.1298 18.4899 25.4908 17.6712 24.5557C16.8525 23.6204 16.3715 22.4412 16.304 21.2051H19.4905Z" />
    <path d="M27.5286 21.2051C27.4594 22.4398 26.978 23.6171 26.1595 24.5508C25.3409 25.4845 24.2316 26.1213 23.0071 26.3623C23.7808 25.4367 24.3019 23.53 24.3421 21.2051H27.5286Z" />
    <path d="M23.7386 21.1993C23.6823 24.2289 22.7523 26.3155 21.9163 26.3155C21.0804 26.3154 20.1503 24.2288 20.094 21.1993H23.7386Z" />
    <path d="M20.2952 5.82718C20.9468 5.52154 21.7087 5.83495 21.9964 6.52738C22.0989 6.77279 22.1301 7.04434 22.0882 7.3096L20.9798 14.3135C17.5423 14.8525 14.9251 17.5976 14.9251 20.9024C14.9251 20.9539 14.9258 21.0054 14.9271 21.0567L11.5081 18.3643C10.9352 17.9138 10.8141 17.0552 11.2386 16.4463C11.2869 16.3764 11.343 16.3119 11.4036 16.253L17.2405 10.5606C17.2934 10.5092 17.2967 10.4225 17.2483 10.3662C17.2064 10.3183 17.1388 10.3078 17.0853 10.3428L8.22686 16.1729C7.90499 16.3839 7.51221 16.4359 7.15167 16.3125L3.13018 14.9336C2.85884 14.8404 2.70975 14.531 2.79717 14.2432C2.84233 14.0951 2.94619 13.9723 3.08038 13.9092L20.2952 5.82718Z" />
    <path d="M20.8255 15.4326C20.0518 16.3642 19.5307 18.2715 19.4905 20.6084H16.304C16.3694 19.3706 16.8494 18.1893 17.6683 17.252C18.4871 16.3147 19.5982 15.6744 20.8255 15.4326Z" />
    <path d="M23.0071 15.4326C24.2344 15.6744 25.3455 16.3147 26.1644 17.252C26.9832 18.1893 27.4633 19.3706 27.5286 20.6084H24.3421C24.3019 18.2715 23.7808 16.3642 23.0071 15.4326Z" />
    <path d="M21.9163 15.4864C22.7523 15.4864 23.6823 17.5729 23.7386 20.6026H20.094C20.1503 17.573 21.0804 15.4864 21.9163 15.4864Z" />
  </svg>
);

export default CommunityItem;
