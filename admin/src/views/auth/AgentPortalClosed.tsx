import Link from 'next/link'

import { BanIcon } from 'lucide-react'

import Logo from '@/components/shared/Logo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { siteConfig } from '@/configs/site'
import AuthBackgroundShape from '@/assets/svg/auth-background-shape'

/** `/agent` on a site whose business model has no agents (b2c): the sign-in's own frame, with the reason. */
const AgentPortalClosed = () => (
  <div className='relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8'>
    <div className='absolute'>
      <AuthBackgroundShape />
    </div>

    <Card className='z-1 w-full gap-6 py-6 sm:max-w-md' role='status'>
      <CardHeader className='gap-6 px-6'>
        <Logo className='gap-3' />
        <div>
          <CardTitle className='mb-2 flex items-center gap-2 text-2xl font-semibold'>
            <BanIcon className='text-muted-foreground size-6' /> Agent portal
          </CardTitle>
          <CardDescription className='text-base'>Agent portal is not available on this site.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className='text-muted-foreground px-6 text-sm'>
        {siteConfig.name} does not run an agent network. Staff sign in on the{' '}
        <Link href='/login' className='text-foreground font-medium underline underline-offset-4'>
          staff sign-in
        </Link>
        .
      </CardContent>
    </Card>
  </div>
)

export default AgentPortalClosed
