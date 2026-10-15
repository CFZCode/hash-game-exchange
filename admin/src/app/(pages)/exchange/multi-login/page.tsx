import { Suspense } from 'react'

import MultiLogin from '@/views/exchange/accounts/MultiLogin'

export const metadata = { title: 'Multi Login Account' }

export default function Page() {
  return (
    <Suspense>
      <MultiLogin />
    </Suspense>
  )
}
