// OUR icon drawings in the Luno two-tone line style (see SKILL.md). 16×16 grid; one accent part per icon.
// Shapes: ['path', d, tone?] ['rect', x, y, w, h, rx, tone?] ['circle', cx, cy, r, tone?] ['line', x1, y1, x2, y2, tone?]
// tone: 'base' (outline, default) | 'accent' (accent stroke) | 'accentFill' (accent fill)
// A cog outline: n teeth between radii r1 (root) and r2 (tip), rounded by the stroke joins.
const gear = (cx, cy, r1, r2, n) => {
  const f = (v) => Math.round(v * 100) / 100;
  const pt = (r, a) => `${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
  const step = (Math.PI * 2) / n;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = i * step - Math.PI / 2;
    d += `${i ? 'L' : 'M'}${pt(r1, a - step * 0.32)}L${pt(r2, a - step * 0.2)}L${pt(r2, a + step * 0.2)}L${pt(r1, a + step * 0.32)}`;
  }
  return ['path', d + 'Z'];
};

const ticks = (cx, cy, r1, r2, n, tone = 'base') =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const f = (v) => Math.round(v * 100) / 100;
    return ['line', f(cx + r1 * Math.cos(a)), f(cy + r1 * Math.sin(a)), f(cx + r2 * Math.cos(a)), f(cy + r2 * Math.sin(a)), tone];
  });

export const ICONS = {
  Gauge: [
    ['path', 'M2.2 11.8C1.4 7.6 4.3 3.5 8 3.5s6.6 4.1 5.8 8.3c-.1.6-.7.9-1.3.7C10.9 12 9.5 11.8 8 11.8s-2.9.2-4.5.7c-.6.2-1.2-.1-1.3-.7Z'],
    ['line', 8, 5.3, 8, 6, 'accent'],
    ['line', 4.7, 6.6, 5.2, 7.1, 'accent'],
    ['line', 4, 9.4, 4.7, 9.4, 'accent'],
    ['line', 11.3, 9.4, 12, 9.4, 'accent'],
    ['line', 8, 9.2, 10.6, 6.6, 'accent'],
    ['circle', 8, 9.2, 0.9, 'accentFill'],
  ],
  Users: [
    ['circle', 6, 5.4, 2.2],
    ['path', 'M2 13.4c0-2.4 1.8-4 4-4s4 1.6 4 4'],
    ['circle', 11.2, 5.9, 1.7, 'accent'],
    ['path', 'M11.6 9.6c1.4.2 2.5 1.5 2.5 3.4', 'accent'],
  ],
  Wallet: [
    ['rect', 2, 4.2, 12, 9, 2],
    ['path', 'M3.6 4.2v-.6c0-.8.7-1.3 1.5-1.2l6.2.9c.6.1 1 .6 1 1.2'],
    ['rect', 10, 7.4, 4, 3.2, 1.2, 'accent'],
    ['circle', 11.7, 9, 0.6, 'accentFill'],
  ],
  Transfer: [
    ['line', 3, 5.5, 12.5, 5.5],
    ['path', 'M10 3l2.5 2.5L10 8'],
    ['line', 13, 10.5, 3.5, 10.5, 'accent'],
    ['path', 'M6 8l-2.5 2.5L6 13', 'accent'],
  ],
  Landmark: [
    ['path', 'M2.5 6 8 2.8 13.5 6Z'],
    ['line', 2.5, 13.3, 13.5, 13.3],
    ['line', 4.6, 7.8, 4.6, 11, 'accent'],
    ['line', 8, 7.8, 8, 11, 'accent'],
    ['line', 11.4, 7.8, 11.4, 11, 'accent'],
  ],
  ChartColumn: [
    ['rect', 2, 2.5, 12, 11, 2],
    ['line', 5.4, 10.4, 5.4, 7.8, 'accent'],
    ['line', 8, 10.4, 8, 5.6, 'accent'],
    ['line', 10.6, 10.4, 10.6, 8.6, 'accent'],
  ],
  Trophy: [
    ['path', 'M5 2.8h6v3.4a3 3 0 0 1-6 0Z'],
    ['path', 'M5 4H3.6a1.5 1.5 0 0 0 0 3H5'],
    ['path', 'M11 4h1.4a1.5 1.5 0 0 1 0 3H11'],
    ['line', 8, 9.2, 8, 11.4],
    ['rect', 5.2, 11.4, 5.6, 1.9, 0.95, 'accentFill'],
  ],
  Dice: [
    ['rect', 2.5, 2.5, 11, 11, 2.6],
    ['circle', 5.6, 5.6, 0.95, 'accentFill'],
    ['circle', 8, 8, 0.95, 'accentFill'],
    ['circle', 10.4, 10.4, 0.95, 'accentFill'],
  ],
  Megaphone: [
    ['path', 'M3 6.2h2.2l6.4-3.1v9.8l-6.4-3.1H3a.9.9 0 0 1-.9-.9V7.1a.9.9 0 0 1 .9-.9Z'],
    ['path', 'M5.5 9.9l.9 3', 'accent'],
    ['line', 13.8, 6.6, 13.8, 9.4, 'accent'],
  ],
  Settings: [
    gear(8, 8, 4.7, 6.3, 8),
    ['circle', 8, 8, 1.9, 'accent'],
  ],
  Shield: [
    ['path', 'M8 2 13 3.8v3.9c0 3-2.2 5.3-5 6.3-2.8-1-5-3.3-5-6.3V3.8Z'],
    ['path', 'M5.8 8.1 7.4 9.6l2.9-3', 'accent'],
  ],
  Bell: [
    ['path', 'M4 11.2V7.6a4 4 0 0 1 8 0v3.6l1 1.1H3Z'],
    ['path', 'M6.6 13.7a1.5 1.5 0 0 0 2.8 0', 'accent'],
    ['circle', 12.2, 3.6, 1.3, 'accentFill'],
  ],
};
