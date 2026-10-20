import { describe, expect, it } from 'vitest';
import { mixProviders } from './catalog';

describe('mixProviders', () => {
  it('deals the row out provider by provider, keeping each provider order', () => {
    const g = (n, p) => ({ name: n, provider: p });
    const out = mixProviders([g('h1', 'Hacksaw'), g('h2', 'Hacksaw'), g('h3', 'Hacksaw'), g('n1', 'NetEnt'), g('p1', 'PlayNGo'), g('n2', 'NetEnt')]);
    expect(out.map((x) => x.name)).toEqual(['h1', 'n1', 'p1', 'h2', 'n2', 'h3']);
  });
});
