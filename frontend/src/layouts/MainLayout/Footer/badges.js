/* The two image strips.
 *
 * THESE ARE THE DEPLOY'S OWN FILES NOW, and the note that used to sit here — that the footer
 * chunk was not in the mirror and the marks were cut out of a screenshot at 1.25 dpr, cropped
 * OPAQUE onto a flat #1E2121 — described a real constraint that turned out not to be one.
 *
 * The chunk hunt is worth recording, because the obvious name is a decoy. `footer-jnUVITid.js`
 * IS on hash.game, and it is a different site's footer: `bc.xyz`, blue `border-[#1b246f]`,
 * "Crypto Currencies We Supported". bc.game's footer is `Tl` inside Enter-MsmOuq5R.js, which
 * lazy-imports `index-BPci0vXA.js`, and that one pulls its artwork from two more:
 *
 *   index-C6DKnkHt.js   the awards strip — sixteen files, `d-92`..`d-99` and `l-92`..`l-99`
 *   index-CzXtN3zP.js   the partner marks — seventeen files, transparent
 *
 * WHY IT MATTERS BEYOND TIDINESS: the opaque crops were only ever correct on layer1, exactly as
 * the old note warned. In the light theme they rendered as black rectangles on a white footer,
 * which is what sent me looking. Every file here carries its own alpha, so both themes work.
 *
 * IT ALSO RETIRED A WHOLE MEASURING APPARATUS. The old file carried `width` (ink), `box` (the
 * original's declared width), `boxHeight`, `align` and a HEIGHTS table, all of it reconstructing
 * the transparent padding a screenshot crop cannot capture — plus a long note on where to put
 * the cutoff between antialiased rim and ink. The real assets have that padding, so the original
 * markup is just `<img width={m.width * remScale}>` with nothing around it, and `width` alone is
 * enough. The declared widths below are the chunk's own.
 */

const awardFiles = import.meta.glob('../../../assets/footer/awards/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

const partnerFiles = import.meta.glob('../../../assets/footer/partners/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

const award = (name) => awardFiles[`../../../assets/footer/awards/${name}.png`];
const partner = (name) => partnerFiles[`../../../assets/footer/partners/${name}.png`];

/* `N` in index-C6DKnkHt.js:
 *
 *   const a = m(() => p.darken ? [x,M,_,y,w,b,I,A] : [E,C,S,F,P,T,k,B]);
 *
 * — eight dark, eight light, and BOTH LISTS RUN 92 THROUGH 99 IN ORDER, so the pair for a given
 * badge is `d-N` / `l-N` with no reshuffling between themes. The alt text is this build's; the
 * chunk renders these with a bare `alt=image` and no titles. */
export const AWARDS = [
  { id: 92, alt: 'Best on Mobile — SiGMA Africa 2024' },
  { id: 93, alt: 'Best Crypto Casino — SiGMA Europe 2024' },
  { id: 94, alt: 'Best Casino Operator — SiGMA Europe 2023' },
  { id: 95, alt: 'Crypto Game Platform of the Year — SiGMA Asia 2023' },
  { id: 96, alt: 'Crypto Casino of the Year — SiGMA America 2022' },
  { id: 97, alt: 'Blockchain Gaming Platform of the Year — AIBC America 2022' },
  { id: 98, alt: 'Crypto Casino of the Year — SiGMA Europe 2022' },
  { id: 99, alt: 'Crypto Casino of the Year — AFFPAPA 2022' },
].map((entry) => ({
  ...entry,
  name: `d-${entry.id}`,
  dark: award(`d-${entry.id}`),
  light: award(`l-${entry.id}`),
}));

/* `oe` in index-BPci0vXA.js, verbatim in order, link and width. `width` is the ONLY geometry the
   original declares — it writes `width: m.width * remScale + "px"` inline and lets each asset's
   own aspect and internal padding do the rest. Expressed as rem here (design px / 16), which is
   the same thing through this project's root-font-size scaling and needs no JS. */
const mark = (entry) => ({ ...entry, src: partner(entry.name) });

export const PARTNERS = {
  certifiers: [
    { name: 'sigma', alt: 'SiGMA', width: 94, href: 'https://sigma.world/' },
    {
      name: 'responsible-gambling',
      alt: 'Responsible Gambling',
      width: 104,
      href: 'https://www.responsiblegambling.org/',
    },
    { name: 'gamcare', alt: 'GamCare', width: 125, href: 'https://www.gamcare.org.uk/' },
    { name: 'betblocker', alt: 'BetBlocker', width: 180, href: 'https://betblocker.org' },
    { name: '18-plus', alt: '18+', width: 50, href: '/help/protect-minors', internal: true },
  ].map(mark),
  sponsorships: [
    { name: 'leicester', alt: 'Leicester City', width: 52, href: 'https://www.lcfc.com/' },
    { name: 'miami', alt: 'Miami Pickleball Club', width: 52, href: 'https://themiamipc.com/home' },
    { name: 'o-higgins', alt: "O'Higgins", width: 52, href: 'https://www.ohigginsfc.cl/' },
    { name: 'jason-derulo', alt: 'Jason Derulo', width: 100, href: 'https://www.jasonderulo.com/' },
    {
      name: 'kwara-united',
      alt: 'Kwara United FC',
      width: 52,
      href: 'https://x.com/KwaraUnitedFC',
    },
  ].map(mark),
};
