import { TIER_COLOR, vipTier } from '../../../data/vipConfig';

/* `rC` in `index-BsFv7ByC.js`, exported by the shared store as `LevelName` — the tier pill under
 * the profile avatar. Three of its four properties are computed from one colour:
 *
 *   color            the tier colour
 *   background-image linear-gradient(to top, <colour>1a, transparent)   i.e. 10% at the bottom
 *   border           1px solid <colour>99                              i.e. 60%
 *
 * so a hex token becomes an alpha by string concatenation, which is why the palette has to stay in
 * `#RRGGBB` form and cannot be a channel triple here.
 *
 * **ITS FALLBACK IS BEGINNER, NOT `currentColor`.** `i[r.base] || i.Beginner` — where
 * `data/vipConfig.js`'s own `tierColor` helper falls through to `currentColor` instead, because the
 * consumer that needed it (`Bonus`'s tier glyph) is the one place the original does the same. Both
 * are right for their own call site, so this reads `TIER_COLOR` directly rather than reusing that
 * helper. The difference only shows for the ten ladder rows whose `levelName` carries a raw newline
 * instead of a space, which is where the family split yields no match.
 *
 * Kept beside the profile dialog rather than in `components/shared`: this is its only call site so
 * far. The signed-in header draws its own ring instead, and the Bonus page's level card names the
 * tier in plain text.
 */
export default function LevelName({ level, className = '', children }) {
  const colour = TIER_COLOR[vipTier(level).base] ?? TIER_COLOR.Beginner;

  return (
    <div
      className={`h-5 rounded py-0 px-2 ${className} bg-layer3 font-semibold`}
      style={{
        color: colour,
        backgroundImage: `linear-gradient(to top, ${colour}1a, transparent)`,
        border: `1px solid ${colour}99`,
      }}
    >
      {children}
    </div>
  );
}
