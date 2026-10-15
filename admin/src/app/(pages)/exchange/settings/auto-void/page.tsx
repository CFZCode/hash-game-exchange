import { Suspense } from 'react'

import AutoVoid from '@/views/exchange/settings/AutoVoid'

export const metadata = { title: 'Auto Void' }

export default function Page() {
  return (
    <Suspense>
      <AutoVoid />
    </Suspense>
  )
}
