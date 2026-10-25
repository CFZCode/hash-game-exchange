/* A player an agent created (the agent tree) uses the site under /agent: React Router's basename,
   so every route and <Link> carries it with no change to any page. Decided once, at mount, from
   the URL the browser opened; GatesContext moves a signed-in player to the right side of it. */
export const AGENT_BASE = '/agent';

export const underAgentBase = (pathname = window.location.pathname) =>
  pathname === AGENT_BASE || pathname.startsWith(`${AGENT_BASE}/`);

/* The same page on the other side of the base: in for an agent's player, out for everyone else. */
export function agentBaseTarget({ pathname, search = '', hash = '' }, agentPlayer) {
  const inside = underAgentBase(pathname);
  if (agentPlayer && !inside) return `${AGENT_BASE}${pathname === '/' ? '' : pathname}${search}${hash}`;
  if (!agentPlayer && inside) return `${pathname.slice(AGENT_BASE.length) || '/'}${search}${hash}`;
  return null;
}
