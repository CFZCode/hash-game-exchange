import { Suspense } from 'react'

import DirectUserWallet from '@/views/players/DirectUserWallet'

export const metadata = { title: 'Direct User Wallet' }

export default function Page() {
  return (
    <Suspense>
      <DirectUserWallet />
    </Suspense>
  )
}
