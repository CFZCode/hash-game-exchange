import { Suspense } from 'react'

import AccountList from '@/views/exchange/AccountList'

export const metadata = { title: 'Account List For Active Users' }

export default function Page() {
  return (
    <Suspense>
      <AccountList variant='active' />
    </Suspense>
  )
}
