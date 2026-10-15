import { Suspense } from 'react'

import BetLimits from '@/views/exchange/settings/BetLimits'

export const metadata = { title: 'Bet Limits' }

export default function Page() {
  return (
    <Suspense>
      <BetLimits />
    </Suspense>
  )
}
