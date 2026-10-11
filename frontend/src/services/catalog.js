import { request } from './client';
import ENDPOINTS from './endpoints';
import { GAMES } from '../data/games';
import { PROVIDERS } from '../data/providers';

/* The game catalogue, shared by the Explore panel and the casino page.
 *
 * TWO ENDPOINTS HERE ARE GUESSES, and it is worth being blunt about which. `src/data/games.js`
 * was GENERATED from two captured game feeds whose request URLs were never recorded, so
 * `ENDPOINTS.games` and `ENDPOINTS.providers` are placeholders shaped like their neighbours.
 * The payloads are real — 118 games deduplicated by `gameUrl`, carrying the feed's own
 * `providerName` / `categoryName` / `tags` — but the paths will need correcting. They live in
 * endpoints.js under a heading that says so, so correcting them is one edit in one file.
 *
 * `providerLogo` and `canonicalProvider` stay in `data/providers.js` and are still imported
 * directly: they resolve a local asset and normalise a name, neither of which a backend does.
 */
export const getGames = () => request(ENDPOINTS.games, { fixture: GAMES });

export const getProviders = () => request(ENDPOINTS.providers, { fixture: PROVIDERS });
