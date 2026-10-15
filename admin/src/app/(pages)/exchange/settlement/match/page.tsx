import { Suspense } from 'react'

import MatchSettlement from '@/views/exchange/settlement/MatchSettlement'

export const metadata = { title: 'Match Settlement' }

export default function Page() {
  return (
    <Suspense>
      <MatchSettlement />
    </Suspense>
  )
}
