import { afterEach, describe, expect, it, vi } from 'vitest';

let rows = [];
vi.mock('./client', () => ({ request: () => Promise.resolve(rows), API_BASE: '', USE_FIXTURES: false }));
const { getHomeBanners } = await import('./banner');

const ids = async () => (await getHomeBanners()).map((s) => s.bannerId);

describe('home slider by mode (user, 2026-10-25)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('the site shows slider-<n>, never the agent slides', async () => {
    vi.stubGlobal('location', { pathname: '/' });
    rows = [{ type: 'slider-1' }, { type: 'agent-slider-1' }];
    expect(await ids()).toEqual(['slider-1']);
  });

  it('/agent shows agent-slider-<n> only, and the built-in four when none are uploaded', async () => {
    vi.stubGlobal('location', { pathname: '/agent' });
    rows = [{ type: 'slider-1' }, { type: 'agent-slider-2' }];
    expect(await ids()).toEqual(['agent-slider-2']);
    rows = [{ type: 'slider-1' }];
    const slides = await getHomeBanners();
    expect(slides.map((s) => s.linkUrl)).toEqual(['/sports', '/casino', '/sports', '/casino']);
  });
});
