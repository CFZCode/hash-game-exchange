import { Suspense } from 'react'

import AgentSystem from '@/views/agent-system/AgentSystem'

export const metadata = { title: 'Agent System' }

export default function Page() {
  return (
    <Suspense>
      <AgentSystem />
    </Suspense>
  )
}
