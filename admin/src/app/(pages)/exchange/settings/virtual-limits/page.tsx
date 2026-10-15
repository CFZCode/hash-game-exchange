import { Suspense } from 'react'

import VirtualBetLimits from '@/views/exchange/settings/VirtualBetLimits'

export const metadata = { title: 'Virtual Bet Limits' }

export default function Page() {
  return (
    <Suspense>
      <VirtualBetLimits />
    </Suspense>
  )
}
