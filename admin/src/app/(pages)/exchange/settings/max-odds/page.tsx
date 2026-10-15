import { Suspense } from 'react'

import MaxOdds from '@/views/exchange/settings/MaxOdds'

export const metadata = { title: 'Max Odds' }

export default function Page() {
  return (
    <Suspense>
      <MaxOdds />
    </Suspense>
  )
}
