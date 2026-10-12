import { Suspense } from 'react'

import { redirect } from 'next/navigation'

import { serverConfig } from '@/configs/site'
import { AGENT_HOME, agentPortalOpen, isAgentTreeLevel, readBusinessModel } from '@/lib/auth/agentPortal'
import { decodeToken, readSessionToken } from '@/lib/auth/session'
import AgentPortalClosed from '@/views/auth/AgentPortalClosed'
import Login from '@/views/auth/Login'

export const metadata = { title: 'Agent portal' }
export const dynamic = 'force-dynamic'

/**
 * The agent portal's sign-in. Open when the owner's business model has agents (b2b, hybrid), read
 * live from the public plan; on a b2c site it says so instead. A visit with a session already
 * goes where the sign-in would have sent it.
 */
export default async function AgentPortalPage() {
  const model = await readBusinessModel(serverConfig.apiUrl)

  if (!agentPortalOpen(model)) return <AgentPortalClosed />

  const token = await readSessionToken()

  if (token) redirect(isAgentTreeLevel(decodeToken(token)?.level) ? AGENT_HOME : '/dashboard')

  return (
    <Suspense>
      <Login portal='agent' />
    </Suspense>
  )
}
