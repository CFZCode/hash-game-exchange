import * as globMaps from './draws.globs.js';
/* Upcoming Lottery Draw.
 *
 * Data: bc.game/bc.game/api/platform-lottery/lottery-info/list-upcoming.html — a real
 * captured response, 20 draws. The five below are the ones on screen, with the API's own
 * name / country / topPrize values.
 *
 * The feed rotates as draws close, so its order moves; the captured response leads with
 * Marruecos / Poland / Slovakia / Spanish / Greece, which is what an earlier screenshot of
 * this page shows. The order here is the later one, and every prize matches the capture.
 *
 * `secondsOut` replaces the API's absolute `drawTime` (a mid-2026 epoch that would render
 * as a huge countdown against today's clock). These are the offsets on screen: two draws a
 * minute apart, which is what the real keno cadence looks like.
 */

/* Vertical offset into the shared country sprite, from `N` in lottery-B9Hmj8MW.js. The
   original stores 24px steps and the card scales by 2.667 (24 * 2.667 = 64, the sprite's
   own row height at that size) before converting to a whole-row percentage. Dividing the
   stored value by 24 gives the same row index directly. */
const COUNTRY_ROW = {
  Malta: 480 / 24,
  Slovakia: 720 / 24,
  Morocco: 528 / 24,
  Poland: 624 / 24,
  Spain: 768 / 24,
  Greece: 312 / 24,
};

export const countryRow = (country) => COUNTRY_ROW[country] ?? 0;

/* `H` in the component — six background/ball/border sets, picked by `index % 6`, so the
   palette repeats down a long list rather than being tied to a given lottery. */
const backgrounds = globMaps.backgrounds;
const balls = globMaps.balls;

const BORDERS = ['#887741', '#577D50', '#7C7D50', '#7D506B', '#50647D', '#577D50'];

export function themeFor(index) {
  const n = (index % 6) + 1;
  return {
    bg: backgrounds[`../../../assets/lottery/bg-${n}.png`],
    ball: balls[`../../../assets/lottery/ball-${n}.png`],
    border: BORDERS[index % 6],
  };
}

/* `/(.+)(\s\d+\/\d+)/` — the trailing "20/80" is split off and rendered in the muted
   colour. `isShort` (<= 14 chars) switches the title box from two clamped lines to one
   balanced line; none of these five are short. */
export function splitName(name) {
  const m = name.match(/(.+)(\s\d+\/\d+)/);
  return {
    text: m ? m[1] : name,
    suffix: m ? m[2] : '',
    isShort: name.length <= 14,
  };
}

export const draws = [
  { id: '131923', name: 'FAST KENO 20/80', country: 'Malta', topPrize: 6000, secondsOut: 52 },
  { id: '131924', name: 'Slovakia EKlub Keno 20/80', country: 'Slovakia', topPrize: 10000, secondsOut: 52 },
  { id: '131921', name: 'Marruecos Keno 20/80', country: 'Morocco', topPrize: 5000, secondsOut: 172 },
  { id: '131922', name: 'Poland Keno 20/70', country: 'Poland', topPrize: 4000, secondsOut: 172 },
  { id: '131925', name: 'Spanish Express 20/70', country: 'Spain', topPrize: 4000, secondsOut: 172 },
];

export default draws;
