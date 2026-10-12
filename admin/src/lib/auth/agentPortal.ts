/**
 * The agent portal (`/agent`): the site admin's sign-in for agents, open only where the owner's
 * business model has agents. Shared by the server page and the client login, so no 'server-only'.
 */

/** Staff levels 4–6 (SUPER_MASTER, MASTER, AGENT) — the agent tree; the same test `/api/auth/me` makes. */
export const isAgentTreeLevel = (level: unknown) => Number(level) >= 4 && Number(level) <= 6

/** Where the portal lands an agent-tree login: its players, scoped to its tree, with quick actions. */
export const AGENT_HOME = '/agent-home'

/** The owner's policy when the site never chose one — backend `sitePolicy.js` POLICY_DEFAULTS. */
const DEFAULT_BUSINESS_MODEL = 'hybrid'

/** The business models that have agents (b2b: agents only; hybrid: agents and public sign-up). */
const AGENT_MODELS = ['b2b', 'hybrid']

export type BusinessModel = 'b2c' | 'b2b' | 'hybrid' | string

/**
 * The owner's business model off the public plan, `GET /api/v1/admin/features/public`
 * (`[{ feature: 'business_model', variant: 'b2b' }, …]`). A read that fails counts as the default,
 * like the player site's gates: a gateway hiccup must not lock agents out.
 */
export async function readBusinessModel(apiUrl: string): Promise<BusinessModel> {
  try {
    const res = await fetch(`${apiUrl}/api/v1/admin/features/public`, { cache: 'no-store' })
    const json = (await res.json()) as { success?: boolean; data?: Array<{ feature?: string; variant?: string }> }
    const row = Array.isArray(json?.data) ? json.data.find(f => f?.feature === 'business_model') : undefined

    return row?.variant || DEFAULT_BUSINESS_MODEL
  } catch {
    return DEFAULT_BUSINESS_MODEL
  }
}

export const agentPortalOpen = (model: BusinessModel) => AGENT_MODELS.includes(model)
