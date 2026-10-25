import { describe, expect, it, vi } from 'vitest';

const asked = [];
vi.mock('./client', () => ({
  USE_FIXTURES: false,
  API_BASE: '',
  request: (path) =>
    Promise.resolve(
      path.endsWith('/categories')
        ? [
            { slug: 'hot', name: 'Hot Games', count: 2 },
            { slug: 'slots', name: 'Slots', count: 0 },
            { slug: 'aviator-picks', name: 'Aviator Picks', count: 0 },
          ]
        : null,
    ),
  requestPage: (path, { params }) => {
    asked.push([path, params]);
    return Promise.resolve({ rows: [], pagination: { total: 0 } });
  },
}));
const { getCasinoPage, isLiveSet } = await import('./catalog');
const { tabsFor, rowsFor, TABS } = await import('../pages/Casino/catalogue');

describe('lobby categories from the site admin (user, 2026-10-25)', () => {
  it('the strip is Lobby, Originals, the categories in order, then Providers', () => {
    const tabs = tabsFor([{ slug: 'hot', name: 'Hot Games' }, { slug: 'aviator-picks', name: 'Aviator Picks' }]);
    expect(tabs.map((t) => t.tab)).toEqual(['', 'brand', 'hot', 'aviator-picks', 'provider']);
    expect(rowsFor([{ slug: 'hot', name: 'Hot Games' }]).map((r) => r.key ?? r.type)).toEqual(['brand', 'hot', 'providers']);
    expect(tabsFor(null)).toBe(TABS);
  });

  it('a curated category reads its picks; an uncurated one keeps its automatic list; a new empty one is empty', async () => {
    await getCasinoPage('hot', { sort: 'a-z' });
    expect(asked.at(-1)).toEqual(['/api/v1/casino/games/categories/hot', { provider: undefined, sort: 'az', page: 1, limit: 100 }]);
    await getCasinoPage('slots');
    expect(asked.at(-1)[1].category).toBe('slots');
    const before = asked.length;
    expect((await getCasinoPage('aviator-picks')).games).toEqual([]);
    expect(asked.length).toBe(before);
    expect(isLiveSet('aviator-picks')).toBe(true);
  });
});
