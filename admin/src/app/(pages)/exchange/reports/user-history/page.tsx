import { Suspense } from 'react'

import View from '@/views/exchange/user-reports/UserHistory'

export const metadata = { title: 'User History' }

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  )
}
