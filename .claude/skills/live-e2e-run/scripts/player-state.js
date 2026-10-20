// Player tab: wallet, first-deposit bonus, bonus balance, rollover, VIP, affiliate in one read.
async () => {
  // Player API call with the page's own session; on 401 it refreshes like the app does and saves the new pair back.
  const API = 'https://api.parker567.com/api/v1/';
  const tokens = () => JSON.parse(localStorage['api-session'] || '{}');
  const refresh = async () => {
    const r = await fetch(API + 'user/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: tokens().refreshToken }) });
    const j = await r.json(); if (!j.success) return false;
    localStorage['api-session'] = JSON.stringify({ ...tokens(), accessToken: j.data.accessToken, refreshToken: j.data.refreshToken ?? tokens().refreshToken });
    return true;
  };
  const call = async (p, init = {}) => {
    let r = await fetch(API + p, { ...init, headers: { ...(init.headers || {}), authorization: 'Bearer ' + tokens().accessToken } });
    if (r.status === 401 && await refresh()) r = await fetch(API + p, { ...init, headers: { ...(init.headers || {}), authorization: 'Bearer ' + tokens().accessToken } });
    const j = await r.json(); return j.success ? j.data : { status: r.status, error: j.error?.code, message: j.error?.message };
  };
  const g = p => call(p);
  const me = await g('user/auth/me');
  const bal = await g('user/wallet/balances');
  const nz = Array.isArray(bal) ? bal.filter(b => Number(b.balance ?? b.amount ?? 0) > 0) : bal;
  return {
    user: me.name,
    balances: nz,
    firstDeposit: await g('user/bonus/first-deposit'),
    bonusBalance: await g('user/bonus-balance'),
    rollover: await g('user/wager/progress'),
    kyc: await g('user/kyc/status'),
    vip: await g('user/vip'),
    affiliate: await g('user/affiliate'),
  };
}
