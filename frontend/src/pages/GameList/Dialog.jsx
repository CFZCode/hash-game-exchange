import { brandLabel } from '../../services/siteBranding';
import { useLocation } from 'react-router-dom';
import PageDialog from '../../components/shared/PageDialog';
import { SectionPage, GameListRoute, TagPage, RelatedPage } from './index';
import { SECTION_TITLES, TAG_TITLES, GAMELIST_TITLES } from './catalogue';

/* The four list routes BELOW `lg` — all of them carry `info: { dialog: m.mobile }`, a DEVICE test,
 * so the same component is a page in the layout column on a desktop and a full-screen dialog on a
 * phone. The pane is resolved from the pathname rather than from `<Outlet/>` for the reason the
 * settings dialog documents: a dialog route here is matched in `App.jsx` and mounted beside
 * `<Routes>`, so there is no matched `<Route>` for an outlet to fill.
 *
 * THE TITLE IS THE PAGE'S OWN and it has to be computed twice — once for the bar and once inside
 * the page, where `PcNav` prints it — because `w3` pushes it into the router's dialog context on
 * the original and this build's port of that context carries the flag rather than the string. The
 * resolution is the chunks' own fallback chain either way (`?label=` -> map -> raw key), so the two
 * cannot drift; `PcNav` then hides itself below `lg`, which is what stops the string appearing
 * twice.
 *
 * `pageGutter`, because each page carries `px-4 lg:px-0` of its own for exactly these widths.
 */
const titleFor = (pathname, search) => {
  const label = new URLSearchParams(search).get('label');
  if (label) return label;

  const [, head, raw = ''] = pathname.split('/');
  const key = decodeURIComponent(raw);

  if (head === 'section') return SECTION_TITLES[key] ?? key;
  if (head === 'tagname') return TAG_TITLES[key] ?? key;
  if (head === 'gamelist') return GAMELIST_TITLES[key] ?? 'Recommend';
  return 'Related Games';
};

export default function GameListDialog({ onClose, onBack, enter }) {
  const { pathname, search } = useLocation();
  const head = pathname.split('/')[1];

  const Pane =
    head === 'section'
      ? SectionPage
      : head === 'tagname'
        ? TagPage
        : head === 'gamelist'
          ? GameListRoute
          : RelatedPage;

  return (
    <PageDialog
      title={brandLabel(titleFor(pathname, search))}
      onClose={onClose}
      onBack={onBack}
      enter={enter}
    >
      <Pane />
    </PageDialog>
  );
}
