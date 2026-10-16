import PageDialog from '../../components/shared/PageDialog';
import { PromotionDetailView } from './index';
import usePromotion from './usePromotion';

/* `/promotion/:segment/:slug` BELOW `lg` — the same body as the desktop page, in the full-screen
 * sheet. The route on the original is `{ path: "/promotion/:id", info: { dialog: m.mobile,
 * keepAlive: !1 } }` (`Enter-MsmOuq5R.js`), and the chunk's root is
 * `<PageLayout title={<div class="mx-16 truncate">{title}</div>}>` — so the bar prints the
 * PROMOTION's title, truncated, and the page hides its own "Promotion" heading.
 *
 * Mounted beside `<Routes>` like every dialog route, so the params come in as props (App.jsx
 * matches the pathname) rather than from `useParams`. */
export default function PromotionDetailDialog({ segment, slug, onClose, onBack, enter }) {
  const { promo, loading } = usePromotion(segment, slug);

  return (
    <PageDialog
      title={<div className="mx-16 truncate">{promo?.title ?? ''}</div>}
      label={promo?.title || 'Promotion'}
      onClose={onClose}
      onBack={onBack}
      enter={enter}
    >
      <PromotionDetailView promo={promo} loading={loading} />
    </PageDialog>
  );
}
