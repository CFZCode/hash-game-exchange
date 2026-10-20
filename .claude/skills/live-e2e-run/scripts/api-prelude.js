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
