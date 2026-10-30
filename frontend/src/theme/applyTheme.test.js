import { beforeEach, describe, expect, it, vi } from 'vitest';

/* A whitelabel's custom palette beats the owner's template, clears back to it, is never applied
   half-formed, and the boot script repaints it before the first read. No DOM library here: a
   minimal <html> and localStorage are enough for what applyTheme touches. */

function fakeDom() {
  const vars = new Map();
  const attrs = new Map();
  const saved = new Map();
  globalThis.document = {
    documentElement: {
      style: { setProperty: (k, v) => vars.set(k, v), removeProperty: (k) => vars.delete(k) },
      setAttribute: (k, v) => attrs.set(k, v),
      removeAttribute: (k) => attrs.delete(k),
    },
  };
  globalThis.localStorage = {
    getItem: (k) => (saved.has(k) ? saved.get(k) : null),
    setItem: (k, v) => saved.set(k, String(v)),
    removeItem: (k) => saved.delete(k),
  };
  return { vars, attrs, saved };
}

const palette = (color = '#112233') =>
  Object.fromEntries(['bg', 's1', 's2', 's3', 'border', 'text', 'muted', 'primary', 'ink', 'accent', 'live', 'hi', 'lo'].map((k) => [k, color]));

describe('whitelabel palette', () => {
  let dom;
  let theme;
  beforeEach(async () => {
    dom = fakeDom();
    vi.resetModules(); // fresh module state (the active-palette flag) per case
    theme = await import('./applyTheme.js');
  });

  it('beats the template, and clears back to it', () => {
    theme.applyTheme('emerald_dark');
    expect(dom.attrs.get('data-theme')).toBe('emerald_dark');

    theme.applyPalette(palette('#AA0000'));
    expect(dom.attrs.get('data-theme')).toBe('custom');
    expect(dom.vars.get('--p-primary')).toBe('#AA0000');

    theme.applyTheme('violet_night');
    expect(dom.attrs.get('data-theme')).toBe('custom', 'a template read later does not undo it');

    theme.applyPalette(null);
    expect(dom.attrs.get('data-theme')).toBe('violet_night');
    expect(dom.vars.size).toBe(0);
    expect(dom.saved.has(theme.PALETTE_STORAGE_KEY)).toBe(false);
  });

  it('ignores an incomplete or malformed palette', () => {
    const partial = palette();
    delete partial.lo;
    theme.applyPalette(partial);
    theme.applyPalette({ ...palette(), bg: 'red' });
    expect(dom.vars.size).toBe(0);
    expect(dom.attrs.has('data-theme')).toBe(false);
  });

  it('the boot script repaints the saved palette before the first read', () => {
    theme.applyPalette(palette('#00FF00'));
    const saved = new Map(dom.saved);
    dom = fakeDom();
    for (const [k, v] of saved) dom.saved.set(k, v);
    new Function(theme.THEME_BOOT_SCRIPT)();
    expect(dom.vars.get('--p-bg')).toBe('#00FF00');
    expect(dom.attrs.get('data-theme')).toBe('custom');
  });
});
