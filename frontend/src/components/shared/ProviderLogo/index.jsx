import { providerLogo } from '../../../data/providers';
import { useSettings } from '../../../context/settings';

/* One provider's mark.
 *
 * Three consumers: the Explore panel's provider dropdown, the casino page's Game Providers
 * strip, and the Providers tab's grid. The list itself, the marks and the name matching all
 * live in data/providers.js — see the note there for where they came from.
 *
 * What used to be here and is gone: a hand-collected map of remote imgxcut URLs, and a set of
 * drawn stand-in badges for the four providers the lobby leads with, in case the CDN was
 * unreachable. Both were consequences of hot-linking. The marks are local assets now, so a
 * logo either exists at build time or does not exist at all — there is nothing to fall back
 * FROM. The name is what a provider outside the list shows, which is what the original does
 * for a provider whose `logo` field is empty.
 */
/* THE TWO SIZES MOVE TOGETHER, which is why the box is a prop and not just the image. Every
   mark is a uniform 200x80, so the rendered height is the width over 2.5 — at the default
   `w-24` that is 38.4px inside a 40px box, filling it almost exactly. Widen the image without
   raising the box and the extra height is simply clipped by its `overflow-hidden`; raise the
   box alone and the mark just floats in more space. */
export default function ProviderLogo({
  name,
  className = 'h-auto w-24',
  boxClassName = 'h-10',
}) {
  /* The theme reaches the DATA here rather than the markup, because a provider's mark is an
     `<img src>` and not something a `dark:` utility can reach. Only BC.GAME has a second file —
     see the note in data/providers.js — so for every other studio this argument changes nothing. */
  const { darken } = useSettings();
  const logo = providerLogo(name, darken);

  if (!logo) {
    return <span className="px-2 text-center text-sm font-semibold text-secondary">{name}</span>;
  }

  return (
    <div className={`center flex overflow-hidden ${boxClassName}`}>
      <img className={`${className} object-contain`} alt={name} src={logo} />
    </div>
  );
}
