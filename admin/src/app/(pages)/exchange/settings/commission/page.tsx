import { Suspense } from 'react'

import Commission from '@/views/exchange/settings/Commission'

export const metadata = { title: 'Commission' }

export default function Page() {
  return (
    <Suspense>
      <Commission />
    </Suspense>
  )
}
