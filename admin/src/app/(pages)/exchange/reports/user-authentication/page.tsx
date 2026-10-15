import { Suspense } from 'react'

import View from '@/views/exchange/user-reports/AuthList'

export const metadata = { title: 'User Authentication' }

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  )
}
