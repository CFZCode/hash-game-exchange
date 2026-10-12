import * as globMaps from './gameArt.globs.js';
/* The 3:4 game artwork, resolved by url slug.
 *
 * `import.meta.glob` loads all game cover images in `src/assets/games`.
 * If a game's exact slug is not found, assetFor uses keyword matching and a deterministic
 * fallback so every single game tile in the Explore page and game grids displays artwork.
 */
/* `jpg` is in the list because of Ezugi. Every other studio's cover comes back from
   imgxcut.com as a PNG, but the eighteen Ezugi tables on the Baccarat tab are addressed by
   UUID rather than by the usual 10-hex-character hash, and the CDN answers those with
   `Content-Type: image/jpeg` — same `.png` request path, JPEG bytes. Saving them as `.png`
   would have worked (browsers sniff images and ignore the declared type) but would have made
   the extension a lie; this keeps the file named for what it holds. */
const art = globMaps.art;

const allKeys = Object.keys(art).filter((k) => !k.includes('gameViewAllCard'));

/* Exact-match only, no fuzzy rule and no hash fallback — `undefined` when there is no file for
   this slug. `assetFor` below always returns SOMETHING, which is what keeps the Explore grid
   full, but it means a game with no artwork silently borrows another game's. Where a missing
   file should read as missing (GameTile then draws the BC brand placeholder), use this. */
export const assetExact = (slug) =>
  slug
    ? art[`../assets/games/${slug}.avif`] ||
      art[`../assets/games/${slug}.png`] ||
      art[`../assets/games/${slug}.jpg`]
    : undefined;

export const assetFor = (slug) => {
  if (!slug) return undefined;

  // 1. Exact match (.avif, .png or .jpg)
  const exactAvif = art[`../assets/games/${slug}.avif`];
  if (exactAvif) return exactAvif;
  const exactPng = art[`../assets/games/${slug}.png`];
  if (exactPng) return exactPng;
  const exactJpg = art[`../assets/games/${slug}.jpg`];
  if (exactJpg) return exactJpg;

  const s = slug.toLowerCase();

  // 2. Keyword fuzzy match for common categories/games
  if (s.includes('poker')) {
    return art['../assets/games/poker-by-evolution-gaming.avif'];
  }
  if (s.includes('baccarat')) {
    return (
      art['../assets/games/baccarat-by-evolution-gaming.avif'] ||
      art['../assets/games/bc-game-baccarat-by-evolution-gaming.avif']
    );
  }
  if (s.includes('blackjack')) {
    return art['../assets/games/blackjack-by-evolution-gaming.avif'];
  }
  if (s.includes('roulette')) {
    return (
      art['../assets/games/roulette-by-evolution-gaming.avif'] ||
      art['../assets/games/roulette.avif']
    );
  }
  if (s.includes('bingo')) {
    return (
      art['../assets/games/bingo.avif'] ||
      art['../assets/games/super-bingo-by-tada.avif']
    );
  }
  if (s.includes('fish') || s.includes('fishing') || s.includes('ocean') || s.includes('hunter')) {
    return (
      art['../assets/games/bc-game-ice-fishing-by-evolution-gaming.avif'] ||
      art['../assets/games/treasure-quest-by-tada.avif']
    );
  }
  if (s.includes('dragon')) {
    return (
      art['../assets/games/dragon-ball-destiny-by-funta-gaming.avif'] ||
      art['../assets/games/dragon-tiger-by-evolution-gaming-17929.avif']
    );
  }
  if (s.includes('dice')) {
    return (
      art['../assets/games/classic-dice.avif'] ||
      art['../assets/games/dice.avif']
    );
  }
  if (s.includes('chests') || s.includes('fortune') || s.includes('gold') || s.includes('money')) {
    return (
      art['../assets/games/fortune-chests-by-endorphina.avif'] ||
      art['../assets/games/fortune-money-boom-by-fa-chai.avif']
    );
  }
  if (s.includes('tiger') || s.includes('wukong') || s.includes('dinosaur') || s.includes('monster') || s.includes('plunder') || s.includes('tycoon')) {
    return (
      art['../assets/games/wukong-by-croco-gaming.avif'] ||
      art['../assets/games/lucky-tiger-by-tada.avif']
    );
  }
  if (s.includes('crash')) {
    return art['../assets/games/crash.avif'] || art['../assets/games/fast-crash.avif'];
  }

  // 3. Deterministic hash fallback across available cover images
  if (allKeys.length > 0) {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = (hash << 5) - hash + s.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % allKeys.length;
    return art[allKeys[idx]];
  }

  return undefined;
};

/* `nr(onlineUsers, 4)` — plain integer below 10,000, then one decimal and a unit. */
export function formatOnlineUsers(n) {
  if (n < 10000) return String(n);
  if (n < 1000000) return (n / 1000).toFixed(1) + 'K';
  return (n / 1000000).toFixed(1) + 'M';
}
