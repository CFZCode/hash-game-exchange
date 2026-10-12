import { Suspense } from 'react'

import AgentHome from '@/views/agent/AgentHome'

export const metadata = { title: 'Agent portal' }

export default function Page() {
  return (
    <Suspense>
      <AgentHome />
    </Suspense>
  )
}
