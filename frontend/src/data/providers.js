import bcLogo from '../assets/logo.png';
import bcLogoLight from '../assets/logo_w.png';

const logos = import.meta.glob(
  '../assets/providers/*.{png,avif}',
  {
    eager: true,
    import: 'default',
  }
);

const mark = (hash) =>
  logos[`../assets/providers/${hash}.png`] ||
  logos[`../assets/providers/${hash}.avif`];

/* THE LIGHT-THEME MARKS ARE REAL, AND THE ENDPOINT THAT HAS THEM IS WORTH KNOWING BY NAME.
 *
 * Every studio ships TWO files — `ProviderView` in index-BvJWs2A7.js picks
 * `darken ? r.logo : r.logoWhite` — and this file carried only the dark half for a long time,
 * because `providerList` is EMPTY in both captured feeds and the marks had been pulled by hash
 * one at a time. Most of them are white ink on transparent, so on a light surface the wordmarks
 * vanished and only the coloured glyphs survived.
 *
 * `GET /game/home/provider/list/?areaCode=<cc>&isBrazil=false&categoryId=<n>` answers
 * unauthenticated on hash.game and returns both URLs per row. Three things about it:
 *
 *   - `categoryId` IS REQUIRED and omitting it returns `code 1001`. Only 1 (slots) and 4 (live)
 *     ever return rows; every other id answers an empty list.
 *   - THE LIST IS REGION-FILTERED. `areaCode=US` gives 24 studios; sweeping forty-one country
 *     codes takes it to 83 and then stops, which is the endpoint's ceiling rather than a
 *     sampling limit.
 *   - The `logo` hash it returns AGREES with the one already in this file for all 47 rows that
 *     matched, which is what proves the two sets are the same artwork and not a lookalike.
 *
 * So 44 of the 59 entries below now carry a `logoLight`. The rest fall back to their dark mark
 * through `providerLogo`'s `??`, and they are:
 *
 *   BC.GAME            uses the site wordmark, which has its own pair (`logo` / `logo_w`)
 *   Nolimit City, Hacksaw Gaming, Pengiun King, Ruby, Bullshark Games, Belatra,
 *   Backseat Gaming, TVBET, Caleta, Realtime Gaming, Atsupachi
 *                      absent from the endpoint in every region and category tried
 *   Novomatic, Trusty Gaming, Tom Horn Gaming
 *                      listed WITH a `logoWhite` URL that 404s at the CDN — the feed's own
 *                      dangling reference, not a fetch that was skipped
 */

/* `aliases` exists for one reason: the game feed names the house studio "BC Originals" while
   the provider list shows it as BC.GAME. Same provider, two spellings, and both have to
   resolve to the same mark. */
export const PROVIDERS = [
  /* THE ONE ROW WITH A SECOND MARK, and it is the header logo's pair rather than anything
     provider-specific: the house studio's wordmark IS the site's, `logo.png`, whose ink is
     near-white and vanishes on the light theme's white tiles. `logoLight` is the original's own
     `logo_w-Vb58juxx.png` — the same 288x64 drawing in near-black — and it is optional, because
     every other mark here is a studio's full-colour artwork that reads on either background. */
  { name: 'BC.GAME', aliases: ['BC Originals'], logo: bcLogo, logoLight: bcLogoLight },
  { name: 'Croco Gaming', logo: mark('ab61b01442'), logoLight: mark('c297a63a28') },
  { name: 'FA CHAI', logo: mark('b6fa55fc56'), logoLight: mark('c9a000ca3e') },
  { name: 'PG Soft', logo: mark('128992a35d'), logoLight: mark('9e14f88b19') },
  { name: 'TaDa', logo: mark('aa905d6c31'), logoLight: mark('3ad4290103') },
  { name: 'Nolimit City', logo: mark('1f7914af40') },
  { name: 'Hacksaw Gaming', logo: mark('ccf8045f30') },
  { name: '1SPIN4WIN', logo: mark('46e85c6609'), logoLight: mark('3f7c55d096') },
  { name: 'Spadegaming', logo: mark('408156443a'), logoLight: mark('67a355300d') },
  { name: 'Foxi', logo: mark('9b7c1cf02c'), logoLight: mark('9a5eac4de8') },
  { name: 'Pengiun King', logo: mark('d491d907d7') },
  { name: 'Evolution Gaming', logo: mark('9c40f44618'), logoLight: mark('987c6d21e6') },
  { name: 'JDB', logo: mark('b7afeab59d'), logoLight: mark('a6ffe1cb42') },
  { name: 'Red Tiger', logo: mark('651ed6cb08'), logoLight: mark('9fde59f701') },
  { name: 'Spribe', logo: mark('e03d7b925f'), logoLight: mark('b54a619d21') },
  { name: 'Booming', logo: mark('1deccce607'), logoLight: mark('325789a6c5') },
  // { name: 'BGaming', logo: mark('75b5d81876'), logoLight: mark('2deb73385c') },
  { name: 'NetEnt', logo: mark('50e7c80e3a'), logoLight: mark('17ac3a9f30') },
  { name: 'AdvantPlay', logo: mark('7a8603b60e'), logoLight: mark('3b3506750d') },
  { name: 'Ruby', logo: mark('9aaca2713b') },
  { name: 'InOut', logo: mark('18139477b2'), logoLight: mark('bde4c7cabf') },
  { name: 'PopOK Gaming', logo: mark('a3d3a3b1ac'), logoLight: mark('c8cb8898ad') },
  { name: 'Amigo Gaming', logo: mark('d6d95c1dde'), logoLight: mark('86442428da') },
  { name: 'Big Time Gaming', logo: mark('dd8ef215f6'), logoLight: mark('98f1fcee86') },
  { name: 'BetSoft', logo: mark('e1162a0386'), logoLight: mark('b5ca520045') },
  { name: 'Novomatic', logo: mark('4047f2dada') },
  { name: 'Platipus', logo: mark('9aec8f2b38'), logoLight: mark('9419418148') },
  { name: 'Bullshark Games', logo: mark('4020d8470e') },
  { name: 'FunTa Gaming', logo: mark('1a8699e3a1'), logoLight: mark('8885d1b2d3') },
  { name: 'Popiplay', logo: mark('7d95aaa8bc'), logoLight: mark('bb3ad9fbd8') },
  { name: 'Belatra', logo: mark('6bf141b73a') },
  { name: 'Onlyplay', aliases: ['OnlyPlay'], logo: mark('ec35f0cabe'), logoLight: mark('bb1c246354') },
  { name: 'Thunderkick', logo: mark('f6d618de9c'), logoLight: mark('71ad4df730') },
  { name: 'Backseat Gaming', logo: mark('86443046ce') },
  { name: 'AvatarUX', logo: mark('fa86aec911'), logoLight: mark('c2c8164074') },
  { name: 'Galaxsys', logo: mark('a98ed75f1e'), logoLight: mark('71f120fa4b') },
  { name: 'Pegasus', logo: mark('bb96fcdaf2'), logoLight: mark('1c2acb1bbc') },
  { name: 'Amusnet', logo: mark('312eeb8de6'), logoLight: mark('ddfe580ccc') },
  { name: 'Tom Horn Gaming', logo: mark('591a3fa8a2') },
  { name: 'TVBET', logo: mark('34568ae274') },
  // { name: 'Winspinity', logo: mark('12dae44819'), logoLight: mark('eafca774ea') },
  { name: 'Habanero', logo: mark('1600322b49'), logoLight: mark('0a111d557d') },
  { name: 'Clutch Gaming', logo: mark('2dc8ba851a'), logoLight: mark('cc2d047295') },
  { name: 'NowNow Gaming', logo: mark('dd4ab6808d'), logoLight: mark('06969a7f6e') },
  { name: 'Happy Duck', logo: mark('772262622f'), logoLight: mark('0faf3165fa') },
  { name: 'Tap-A-Roo', logo: mark('db38919d0c'), logoLight: mark('8c8730b1d1') },
  { name: 'Ezugi', logo: mark('5e9d393fde'), logoLight: mark('1d250b95de') },
  { name: 'Caleta', logo: mark('b88c82bdd7') },
  { name: 'Sexy Gaming', logo: mark('2e8e44ae59'), logoLight: mark('ec139d038a') },
  { name: 'Trusty Gaming', logo: mark('e05b242a5e') },
  { name: 'Neko Games', logo: mark('32f0dc4f00'), logoLight: mark('a499f47477') },
  { name: 'Sneaky Slots', logo: mark('43f46874d3'), logoLight: mark('49cf27e02e') },
  { name: 'BF Games', logo: mark('e4c0234846'), logoLight: mark('af66fc4242') },
  { name: 'Winfinity', logo: mark('ca2c0677f4'), logoLight: mark('9e8931c1e6') },
  { name: 'Realtime Gaming', logo: mark('d9f0c93a08') },
  { name: 'WALI GAMES', logo: mark('3edda86a11'), logoLight: mark('0f2579ad14') },
  { name: 'SV388', logo: mark('82f75ec6a6'), logoLight: mark('cd966bc02b') },
  { name: 'Atsupachi', logo: mark('126d2fd39e') },
  // { name: 'Endorphina', logo: mark('311c691438'), logoLight: mark('95806b9b0c') },
];

export const PROVIDER_NAMES = PROVIDERS.map((provider) => provider.name);

/* Exact, case-insensitive, name-or-alias. NOT the substring match this replaces: with three
   providers a loose `includes` was survivable, with forty-six it is a collision waiting to
   happen — "TaDa" is inside no other name today, but "JDB", "InOut" and "NetEnt" are the kind
   of short strings that make that luck rather than design. */
const byName = new Map();
for (const provider of PROVIDERS) {
  byName.set(provider.name.toLowerCase(), provider);
  for (const alias of provider.aliases || []) byName.set(alias.toLowerCase(), provider);
}

/* `darken` defaults TRUE so every existing call site keeps its dark mark with no argument, and
   so a caller that has no opinion cannot accidentally ask for the light one. Only `BC.GAME`
   carries a `logoLight`; the `??` is what makes the parameter a no-op for the other twenty-odd. */
export function providerLogo(name, darken = true) {
  if (!name) return undefined;
  const entry = byName.get(name.toLowerCase().trim());
  if (!entry) return undefined;
  return darken ? entry.logo : entry.logoLight ?? entry.logo;
}

/* The provider's one canonical name, so two spellings of the same studio compare equal.
   Filtering needs this, not just the logo: the games in data/games.js carry `BC Originals`
   while the filter offers `BC.GAME`, so a raw string comparison silently matches nothing and
   selecting the house studio would empty the grid. Unknown names pass through unchanged. */
export function canonicalProvider(name) {
  if (!name) return name;
  return byName.get(name.toLowerCase().trim())?.name ?? name;
}
