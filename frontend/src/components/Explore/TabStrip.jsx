import ScrollTabs, { ACTIVE } from '../shared/ScrollTabs';
import { TABS } from './catalogue';
import { useSettings } from '../../context/settings';
import { useGates } from '../../context/gates';

/* `ye` in index-BChnjnW3.js wrapped in `fe` (the ScrollTabs of index-DrTwTnbT.js).
 *
 * `fe` itself now lives in components/shared/ScrollTabs — the casino page's tab strip is a
 * second consumer of the same scroller. What is left here is `ye`: the Explore tab list and
 * how one tab looks, which is all this component ever was.
 *
 * The arrows are `!m.mobile` on the original, i.e. desktop only. That check used to be skipped
 * here on the grounds that the panel was desktop-only anyway — which stopped being true when
 * `/explore` became a page below `lg` and the arrows started appearing on it. It now lives in
 * `ScrollTabs`, where `fe` puts it, so this call site passes nothing and gets the site's own
 * behaviour: arrows on a desktop, grab-to-scroll on a narrow window, native swipe on a phone.
 */

export default function TabStrip({ tab, setTab }) {
  const { darken } = useSettings();
  const gates = useGates();

  return (
    <ScrollTabs>
      {TABS.filter(({ value }) => value !== 'original' || gates.on('originals')).map(({ label, value, Icon }) => {
        const selected = value === tab;
        return (
          <button
            key={value}
            type="button"
            className={`flex h-10 flex-none items-center justify-center rounded-lg px-2 py-0 sm:hover:bg-layer3 ${
              selected ? `${ACTIVE} bg-tab_selected sm:hover:bg-tab_selected` : ''
            }`}
            style={selected ? { color: 'var(--color-alw_white)' } : undefined}
            onClick={(event) => {
              event.preventDefault();
              setTab(value);
            }}
          >
            {/* Same conditional as the casino strip's — see the note over its `TabIcon`, which
                is where the mechanism is written down. Both strips are the same `fe` child. */}
            <Icon
              className={`icon size-5 flex-none ${
                selected ? (darken ? 'fill-brand' : '') : 'fill-secondary'
              }`}
            />
            <span
              className={`ml-1 whitespace-nowrap ${selected ? 'font-extrabold' : 'text-secondary'}`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </ScrollTabs>
  );
}
