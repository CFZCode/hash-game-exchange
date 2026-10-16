import React from 'react';
import { useResource } from '../../hooks/useResource';
import { getPromotionBySlug } from '../../services/promotions';

/* One promotion, read once per `segment`/`slug`. Shared by the page and ./Dialog.jsx, which needs
   the title for its bar. A failed read (anything but the 404 the service already turns into
   `null`) renders as not found rather than throwing. */
export default function usePromotion(segment, slug) {
  const read = React.useCallback(() => getPromotionBySlug(segment, slug), [segment, slug]);
  const { data, loading, error } = useResource(read);
  return { promo: error ? null : (data ?? null), loading };
}
