import { Suspense } from 'react'

import View from '@/views/exchange/user-reports/FraudReport'

export const metadata = { title: 'Fraud Report' }

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  )
}
