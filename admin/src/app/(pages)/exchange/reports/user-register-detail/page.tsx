import { Suspense } from 'react'

import View from '@/views/exchange/user-reports/UserRegisterDetail'

export const metadata = { title: 'User Register Detail' }

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  )
}
