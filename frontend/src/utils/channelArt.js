import * as globMaps from './channelArt.globs.js';
/* The fiat deposit channels' logos.
 *
 * A glob in its own module for the reason `gameArt.js` and `coinArt.js` are: `import.meta.glob`
 * resolves relative to the file it is written in, so a shared resolver can only live in one
 * place.
 *
 * THE FILES ARE THE LIVE CDN'S OWN, pulled from `img2.distributedresourcestorage.com/fait/…`
 * — the URLs came off the fiat tab's rendered DOM, which is the only place they appear: the
 * channel list they arrive in is behind authentication and `hash.game` answers it 6002.
 * `b` in utils-BRLjIBPE.js picks `nightIcon` or `lightIcon` off the theme; this build is
 * dark-only, so only the night file of each is fetched.
 *
 * SIX CHANNELS, FOUR FILES. UPI, UPI_utr and the sixth row all render the same UPI mark — two
 * distinct CDN paths (`172717187996330` and `17271715845490`) serving byte-identical PNGs, so
 * the duplicate is not kept, the same dedupe the raffle's thirteen avatars got.
 *
 * Named by the fixture's `nightIcon` basename, so that field doubles as the lookup key with no
 * table in between — the arrangement `promotions.js`'s `image` and the deposit-offer card's
 * artwork both use. */
const ART = globMaps.ART;

const BY_NAME = Object.fromEntries(
  Object.entries(ART).map(([path, url]) => [path.split('/').pop().replace(/\.png$/, ''), url]),
);

export const channelIcon = (name) => BY_NAME[name];

export default channelIcon;
