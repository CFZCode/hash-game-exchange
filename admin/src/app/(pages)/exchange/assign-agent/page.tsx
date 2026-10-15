import { Suspense } from 'react'

import AssignAgent from '@/views/exchange/accounts/AssignAgent'

export const metadata = { title: 'Assign Agent' }

export default function Page() {
  return (
    <Suspense>
      <AssignAgent />
    </Suspense>
  )
}
