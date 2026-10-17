import { describe, expect, it } from 'vitest';
import { badgeSrc, toVipStanding } from './vip';

describe('VIP branding on the standing', () => {
  it('carries the admin name and a loadable badge URL', () => {
    const s = toVipStanding({ level: 2, name: 'Bronze II', card: 'bronze', badgeUrl: '/api/v1/admin/vip-branding/badges/bronze/image?v=abc', progressPct: '10', nextLevel: 3, wagerToNextLevel: '100' });
    expect(s.name).toBe('Bronze II');
    expect(s.badgeUrl).toMatch(/\/api\/v1\/admin\/vip-branding\/badges\/bronze\/image\?v=abc$/);
  });

  it('no badge from the API means the built-in glyph', () => {
    expect(toVipStanding({ level: 0, name: 'Beginner', card: 'unranked' }).badgeUrl).toBeNull();
    expect(badgeSrc(null)).toBeNull();
    expect(badgeSrc('https://cdn.example/x.png')).toBe('https://cdn.example/x.png');
  });
});
