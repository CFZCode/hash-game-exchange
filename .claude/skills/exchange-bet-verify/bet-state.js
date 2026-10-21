// chrome-devtools evaluate_script (sourcePath) on YOUR OWN signed-in /sports/match/:sid/:gmid page.
// Read-only. Returns what the PAGE prints (header balance, each market card, the slip, Open Bets)
// next to what the API answers (wallet, match exposure rows = per-runner book, open bets on the event).
// Feed it to compare.mjs together with the bets you placed.
async () => {
  const API = 'https://api.parker567.com/api/v1/';
  const tok = () => JSON.parse(localStorage['api-session'] || '{}');
  const call = async (p, init = {}) => {
    const go = () => fetch(API + p, { ...init, headers: { 'content-type': 'application/json', ...(init.headers || {}), authorization: 'Bearer ' + tok().accessToken } });
    let r = await go();
    if (r.status === 401) {
      const rr = await (await fetch(API + 'user/auth/refresh', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: tok().refreshToken }) })).json();
      if (rr.success) { localStorage['api-session'] = JSON.stringify({ ...tok(), accessToken: rr.data.accessToken, refreshToken: rr.data.refreshToken ?? tok().refreshToken }); r = await go(); }
    }
    return r.json();
  };
  const [, , , sid, gmid] = location.pathname.split('/');
  const me = (await call('user/auth/me')).data;
  const wallet = (await call('user/wallet/balances')).data;
  const expo = (await call('sports/user/matchexposures/match', { method: 'POST', body: JSON.stringify({ user_id: Number(me.id), match_id: String(gmid) }) })).data || [];
  const open = (await call(`sports/user/cricket/user-open-bets-grouped?eventid=${gmid}&user_id=${me.id}`)).data || {};
  const txt = (el) => (el?.innerText || '').replace(/\n+/g, ' | ').trim();
  const sections = [...document.querySelectorAll('section')].map(txt).filter((t) => /-?\d/.test(t));
  const aside = [...document.querySelectorAll('aside, [class*=rail], [class*=OpenBets]')].map(txt).filter((t) => /Open Bets|Matched/.test(t));
  return {
    at: new Date().toISOString(), user: me.name, userId: me.id, sid, gmid,
    page: { header: document.body.innerText.split('\n')[0], sections, openBetsPanel: aside[0] || null },
    api: {
      inr: Number(wallet?.INR),
      exposureRows: expo.map((r) => [r.game_type, r.team_name, Number(r.exposure_amount)]),
      openBets: (open.matchedBets || []).map((b) => ({ id: b.id, market: b.market_type, sel: b.selection_name, side: b.bet_type, odds: Number(b.odds), size: Number(b.size), stake: Number(b.stake_amount), liability: Number(b.liability), status: b.status })),
    },
  };
}
