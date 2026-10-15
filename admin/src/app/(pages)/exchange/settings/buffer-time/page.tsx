import { Suspense } from 'react'

import BufferTime from '@/views/exchange/settings/BufferTime'

export const metadata = { title: 'Buffer Time' }

export default function Page() {
  return (
    <Suspense>
      <BufferTime />
    </Suspense>
  )
}
