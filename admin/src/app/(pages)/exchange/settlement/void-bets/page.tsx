import { Suspense } from 'react'

import VoidBets from '@/views/exchange/settlement/VoidBets'

export const metadata = { title: 'Void Bets' }

export default function Page() {
  return (
    <Suspense>
      <VoidBets />
    </Suspense>
  )
}
