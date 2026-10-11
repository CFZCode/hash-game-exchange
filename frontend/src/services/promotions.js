import { request } from './client';
import ENDPOINTS from './endpoints';
import { PROMOTIONS, TABS, TABS_H5, PAGE_SIZE } from '../pages/Promotions/promotions';

/* The promotions list.
 *
 * `ENDPOINTS.promotions` is a PLACEHOLDER — no promotions request was captured, so the path is
 * shaped like its neighbours and grouped in endpoints.js under a heading that says so. The
 * payload below, on the other hand, is transcribed from the rendered page and is exact.
 *
 * Paged here rather than in the component, so the page keeps working unchanged when a real
 * backend does the paging. The tab is passed through as a parameter for the same reason: today
 * it filters an array, tomorrow it is a query string, and the call site does not care which.
 */
export const getPromotions = ({ page = 1, tab = 'all', env = 'WEB', archived = false } = {}) => {
  /* `env` AND `archived` ARE THE REQUEST'S OWN FIELDS, not this build's parameters — the page
     chunk posts `{areaCode, env: isAPP ? "APP" : mobile ? "H5" : "WEB", level, vip, lang,
     archived, page, pageSize}`. `env` is what makes the phone's tab strip three entries and the
     desktop's four (see TABS_H5), and `archived` is the whole of what the Archived button does:
     the same list, the same endpoint, one flag flipped.

     NOTHING IS CAPTURED BEHIND `archived: true` and the endpoint answers 403 to everyone, so the
     archived list is empty and the popup renders the site's own empty state. That is the
     Transaction pane's finding again — being locked out is the correct rendering — rather than a
     stub, and it is why the button is wired to real data instead of being left inert. */
  const source = archived ? [] : PROMOTIONS;
  const matching = tab === 'all' ? source : source.filter((p) => p.categories.includes(tab));
  const start = (page - 1) * PAGE_SIZE;

  return request(ENDPOINTS.promotions, {
    params: { page, tab, env, archived },
    fixture: {
      tabs: env === 'H5' ? TABS_H5 : TABS,
      promotions: matching.slice(start, start + PAGE_SIZE),
      page,
      pageSize: PAGE_SIZE,
      total: matching.length,
    },
  });
};
