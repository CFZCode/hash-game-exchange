/* Sample props for /dev/exchange-kit. Realistic shapes, invented numbers — dev preview only,
 * never imported by a real page. */

const lv = (price, size) => ({ price, size });
const inHours = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();

export const SPORTS = [
  { id: 'cricket', label: 'Cricket', icon: 'cricket', count: 14 },
  { id: 'football', label: 'Football', icon: 'soccer', count: 38 },
  { id: 'tennis', label: 'Tennis', icon: 'tennis', count: 9 },
];

export const MATCH_ODDS = {
  id: 'mo-1',
  name: 'Match Odds',
  min: 100,
  max: 500000,
  status: 'OPEN',
  runners: [
    {
      id: 'ind',
      name: 'India',
      back: [lv(1.84, 125430), lv(1.83, 48200), lv(1.82, 9800)],
      lay: [lv(1.85, 98210), lv(1.86, 31500), lv(1.87, 12000)],
      pnl: 1250,
    },
    {
      id: 'aus',
      name: 'Australia',
      back: [lv(2.18, 87650), lv(2.16, 22000), lv(2.14, 5400)],
      lay: [lv(2.2, 64300), lv(2.22, 18700), lv(2.24, 3100)],
      pnl: -800,
    },
    {
      id: 'draw',
      name: 'The Draw',
      back: [lv(36, 1450), lv(34, 820), lv(32, 300)],
      lay: [lv(40, 990), lv(42, 410), lv(null, null)],
      pnl: -800,
    },
  ],
};

export const BOOKMAKER = {
  id: 'bm-1',
  name: 'Bookmaker',
  min: 100,
  max: 200000,
  status: 'OPEN',
  runners: [
    { id: 'ind', name: 'India', back: [lv(84, 500000)], lay: [lv(87, 500000)], pnl: 900 },
    { id: 'aus', name: 'Australia', back: [lv(115, 500000)], lay: [lv(119, 500000)], pnl: -450 },
    { id: 'draw', name: 'The Draw', back: [lv(null)], lay: [lv(null)], status: 'SUSPENDED' },
  ],
};

export const TIED = {
  id: 'tied-1',
  name: 'Tied Match',
  min: 100,
  max: 50000,
  runners: [
    { id: 'yes', name: 'Yes', back: [lv(48, 2300)], lay: [lv(60, 1900)] },
    { id: 'no', name: 'No', back: [lv(1.01, 450000)], lay: [lv(1.02, 380000)] },
  ],
};

export const FANCY = [
  { id: 'f1', name: '6 over runs IND', no: { line: 52, rate: 100 }, yes: { line: 54, rate: 100 }, min: 100, max: 50000, pnl: 400 },
  { id: 'f2', name: '10 over runs IND', no: { line: 84, rate: 110 }, yes: { line: 84, rate: 90 }, min: 100, max: 50000, badlo: true },
  { id: 'f3', name: 'V Kohli runs', no: { line: 31, rate: 100 }, yes: { line: 32, rate: 100 }, min: 100, max: 25000, status: 'SUSPENDED' },
  { id: 'f4', name: 'Fall of 3rd wkt IND', no: { line: 118, rate: 100 }, yes: { line: 120, rate: 100 }, min: 100, max: 25000, status: 'BALL RUNNING', pnl: -250 },
];

export const ODD_EVEN = [
  { id: 'oe1', name: '7.1 over run', odd: lv(1.95, 10000), even: lv(1.95, 10000) },
  { id: 'oe2', name: '8.1 over run', odd: lv(1.92, 8000), even: lv(1.98, 8000), status: 'BALL RUNNING' },
];

export const LINE = [
  {
    id: 'l1',
    name: 'IND 20 over total runs',
    no: [lv(172, 5000), lv(171, 3000), lv(170, 1200)],
    yes: [lv(173, 4800), lv(174, 2500), lv(175, 900)],
    pnl: 0,
  },
];

export const MATCHES = [
  {
    id: 'm1', competition: 'ICC Champions Trophy', sport: 'cricket', home: 'India', away: 'Australia',
    inPlay: true, score: '142/3 (17.2)', hasTv: true, hasBookmaker: true, hasFancy: true,
    odds: { home: { back: lv(1.84, 125430), lay: lv(1.85, 98210) }, draw: { back: lv(36, 1450), lay: lv(40, 990) }, away: { back: lv(2.18, 87650), lay: lv(2.2, 64300) } },
  },
  {
    id: 'm2', competition: 'ICC Champions Trophy', sport: 'cricket', home: 'England', away: 'South Africa',
    startTime: inHours(3), hasBookmaker: true, hasFancy: true,
    odds: { home: { back: lv(2.04, 22000), lay: lv(2.06, 18000) }, draw: null, away: { back: lv(1.95, 21000), lay: lv(1.97, 15000) } },
  },
  {
    id: 'm3', competition: 'Indian Premier League', sport: 'cricket', home: 'Mumbai Indians', away: 'Chennai Super Kings',
    inPlay: true, score: '88/2 (10.0)', hasTv: true, hasBookmaker: true, hasFancy: true, status: 'SUSPENDED',
    odds: { home: { back: lv(1.6, 5400), lay: lv(1.62, 4300) }, away: { back: lv(2.6, 3200), lay: lv(2.64, 2100) } },
  },
  {
    id: 'm4', competition: 'English Premier League', sport: 'soccer', home: 'Arsenal', away: 'Manchester City',
    startTime: inHours(26), hasTv: true,
    odds: { home: { back: lv(2.9, 41200), lay: lv(2.92, 30100) }, draw: { back: lv(3.45, 12000), lay: lv(3.5, 9800) }, away: { back: lv(2.5, 38000), lay: lv(2.52, 27600) } },
  },
];

export const LATEST = [
  { id: 'm1', name: 'India v Australia', sport: 'cricket', inPlay: true },
  { id: 'm3', name: 'Mumbai Indians v Chennai Super Kings', sport: 'cricket', inPlay: true },
  { id: 'm4', name: 'Arsenal v Manchester City', sport: 'soccer', startTime: inHours(26) },
  { id: 't1', name: 'C. Alcaraz v J. Sinner', sport: 'tennis', startTime: inHours(5) },
  { id: 'm2', name: 'England v South Africa', sport: 'cricket', startTime: inHours(3) },
];

export const MATCHED = [
  { id: 'b1', runnerName: 'India', marketName: 'Match Odds', side: 'back', price: 1.84, stake: 1500, profit: 1260, liability: 1500, placedAt: new Date().toISOString() },
  { id: 'b2', runnerName: 'Australia', marketName: 'Bookmaker', side: 'lay', price: 119, stake: 500, profit: 500, liability: 595, placedAt: new Date().toISOString() },
  { id: 'b3', runnerName: '6 over runs IND', marketName: 'Fancy', side: 'yes', price: 54, rate: 100, stake: 400, profit: 400, liability: 400 },
];

export const STAKES = [100, 500, 1000, 2500, 5000, 10000, 25000, 50000];
