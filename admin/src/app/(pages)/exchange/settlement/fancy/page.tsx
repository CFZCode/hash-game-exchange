import { Suspense } from 'react'

import FancySettlement from '@/views/exchange/settlement/FancySettlement'

export const metadata = { title: 'Fancy Settlement' }

export default function Page() {
  return (
    <Suspense>
      <FancySettlement />
    </Suspense>
  )
}
