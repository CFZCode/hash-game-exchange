import { describe, expect, it } from 'vitest';
import { agentBaseTarget, underAgentBase } from './agentBase';

describe('agent base (/agent for an agent-created player)', () => {
  it('knows the base only as a whole path segment', () => {
    expect(underAgentBase('/agent')).toBe(true);
    expect(underAgentBase('/agent/casino')).toBe(true);
    expect(underAgentBase('/agents')).toBe(false);
    expect(underAgentBase('/casino')).toBe(false);
  });
  it("moves an agent's player in, keeping the page", () => {
    expect(agentBaseTarget({ pathname: '/', search: '' }, true)).toBe('/agent');
    expect(agentBaseTarget({ pathname: '/sports/my-bets', search: '?t=1', hash: '#x' }, true)).toBe('/agent/sports/my-bets?t=1#x');
    expect(agentBaseTarget({ pathname: '/agent/casino' }, true)).toBeNull();
  });
  it('moves a direct player out, keeping the page', () => {
    expect(agentBaseTarget({ pathname: '/agent' }, false)).toBe('/');
    expect(agentBaseTarget({ pathname: '/agent/wallet/deposit', search: '?a=1' }, false)).toBe('/wallet/deposit?a=1');
    expect(agentBaseTarget({ pathname: '/casino' }, false)).toBeNull();
  });
});
