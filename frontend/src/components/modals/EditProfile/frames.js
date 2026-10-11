/* The avatar-frame catalogue — DATA ONLY, because `frames.jsx` beside it exports components and
 * Fast Refresh will not have both in one file. That is the same split `pages/Wallet/Balance` makes
 * between `utils.js` and `CurrencyList.jsx`, and for the same reason.
 *
 * The ORDER is the original's: `Y` with `Oe` removed in `Profile-D32vXKY5.js`, which is
 * `[0, 9, 6, 7, 1, 2, 3, 8, 4, 5]` — exactly the ten cells the live page draws, with id 0 as the
 * "Not used" cell rather than a ring.
 *
 * THE COLOURS ARE APPROXIMATIONS. The rings themselves are drawn by a lazily-registered `Frame`
 * component the mirror never saved, and there is no frame image anywhere in it, so these are read
 * off the live page rather than recovered. `frames.jsx` carries the longer form of that argument.
 */

/* THE ORDER IS THE CHUNK'S: `Y` minus `Oe`. Id 0 is the "Not used" cell. `desc` is what the
   header's right-hand slot prints for the selected frame — the live page shows "Upgrade to
   Beginner to receive" against a locked one, which is the string used here. */
export const AVATAR_FRAMES = [
  { id: 0, name: 'Not used', desc: '' },
  { id: 9, name: 'Bronze', ring: '#C8A063', accent: '#E6C78F', desc: 'Upgrade to Beginner to receive' },
  { id: 6, name: 'Rose', ring: '#C98B93', desc: 'Upgrade to Beginner to receive' },
  { id: 7, name: 'Sky', ring: '#7FA6C4', desc: 'Upgrade to Beginner to receive' },
  { id: 1, name: 'Amber', ring: '#D2A05A', desc: 'Upgrade to Beginner to receive' },
  { id: 2, name: 'Jade', ring: '#7FBF8F', desc: 'Upgrade to Beginner to receive' },
  { id: 3, name: 'Periwinkle', ring: '#9AA4D8', desc: 'Upgrade to Beginner to receive' },
  { id: 8, name: 'Azure', ring: '#6E8FC7', desc: 'Upgrade to Beginner to receive' },
  { id: 4, name: 'Emerald Crest', ring: '#5FBF7A', accent: '#F0C24B', gems: true, desc: 'Upgrade to Beginner to receive' },
  { id: 5, name: 'Violet Crest', ring: '#9B6FD4', accent: '#F0C24B', gems: true, desc: 'Upgrade to Beginner to receive' },
];
