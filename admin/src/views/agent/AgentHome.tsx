'use client'

import Link from 'next/link'

import { ArrowLeftRightIcon, BookOpenIcon, WalletIcon } from 'lucide-react'

import Can from '@/components/shared/Can'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSession } from '@/contexts/SessionContext'
import PlayersList, { CreatePlayer } from '@/views/players/PlayersList'

/**
 * The agent portal's home (`/agent` signs an agent-tree login in here). Nothing new underneath:
 * the existing Users list — the platform scopes it to the caller's tree — under a row of quick
 * actions into the existing screens, each behind the same permission its sidebar entry carries.
 */
const AgentHome = () => {
  const { actor } = useSession()

  return (
    <div>
      <Card className='mb-6 gap-4 py-5'>
        <CardHeader className='px-5'>
          <CardTitle className='text-lg'>Agent portal{actor?.name ? ` · ${actor.name}` : ''}</CardTitle>
          <CardDescription>Your players, their balances and your statement.</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-wrap gap-2 px-5'>
          <Can permission='users:write'>
            <CreatePlayer />
          </Can>
          <Can permission='wallet:read'>
            <Button variant='outline' nativeButton={false} render={<Link href='/wallets' />}>
              <WalletIcon /> Fund a player
            </Button>
          </Can>
          <Can permission='staff:read'>
            <Button variant='outline' nativeButton={false} render={<Link href='/transfers' />}>
              <ArrowLeftRightIcon /> Transfers
            </Button>
          </Can>
          <Can permission='reports:read'>
            <Button variant='outline' nativeButton={false} render={<Link href='/reports/statements' />}>
              <BookOpenIcon /> Statement
            </Button>
          </Can>
        </CardContent>
      </Card>
      <PlayersList />
    </div>
  )
}

export default AgentHome
