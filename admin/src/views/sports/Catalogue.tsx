'use client'

import { useState, type ReactNode } from 'react'

import { InfoIcon } from 'lucide-react'

import Can from '@/components/shared/Can'
import DataTable, { type Column } from '@/components/shared/DataTable'
import { TextField } from '@/components/shared/FormField'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useApiMutation, useListState, usePagedApi } from '@/hooks/use-api'
import { api } from '@/lib/api/client'

/**
 * Which sports the book offers and which fancy markets are hidden used to come
 * from `admin/sports/catalogue/*`. The sports service here (the mssports /
 * TENEXCH port) has no such routes — both tabs showed empty tables on 404s.
 * They now say so; the per-user lock list (bet-admin) is real and stays.
 */
const Unavailable = ({ children }: { children: ReactNode }) => (
  <Alert>
    <InfoIcon />
    <AlertTitle>Not available on this sportsbook backend</AlertTitle>
    <AlertDescription>{children}</AlertDescription>
  </Alert>
)

const Locks = () => {
  const { set, query } = useListState()

  const users = usePagedApi<Record<string, unknown> & { userId?: number; username?: string; locked?: boolean }>('admin/sports/bet-admin/locks/users', {
    limit: query.limit,
    page: query.page,
    lockedOnly: true
  })

  const setLock = useApiMutation({
    fn: (v: { userId: number; locked: boolean }) => api.post('admin/sports/bet-admin/locks/users', v),
    invalidate: [['paged', 'admin/sports/bet-admin/locks/users']],
    success: (_r, v) => `User ${v.locked ? 'locked out of' : 'allowed back into'} the sportsbook`
  })

  const [userId, setUserId] = useState('')

  const columns: Column<{ userId?: number; username?: string; locked?: boolean }>[] = [
    { key: 'user', header: 'User', cell: u => <span>{u.username ?? `#${u.userId}`}</span> },
    { key: 'locked', header: 'Sports locked', cell: u => <StatusBadge value={u.locked ? 'locked' : 'active'} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: u => (
        <Can permission='sports:manage'>
          <Button size='sm' variant='outline' onClick={() => u.userId && setLock.mutate({ userId: u.userId, locked: !u.locked })}>
            {u.locked ? 'Unlock' : 'Lock'}
          </Button>
        </Can>
      )
    }
  ]

  return (
    <div className='grid gap-4'>
      <Can permission='sports:manage'>
        <div className='flex flex-wrap items-end gap-2'>
          <TextField id='lk-uid' label='User id' value={userId} onChange={e => setUserId(e.target.value.replace(/\D/g, ''))} />
          <Button variant='outline' disabled={!/^\d+$/.test(userId)} onClick={() => setLock.mutate({ userId: Number(userId), locked: true })}>
            Lock
          </Button>
          <Button variant='outline' disabled={!/^\d+$/.test(userId)} onClick={() => setLock.mutate({ userId: Number(userId), locked: false })}>
            Unlock
          </Button>
        </div>
      </Can>
      <DataTable
        columns={columns}
        rows={users.data?.rows}
        rowKey={(u, i) => String(u.userId ?? i)}
        loading={users.isLoading}
        error={users.error}
        pagination={users.data?.pagination}
        onPageChange={page => set({ page })}
        onLimitChange={limit => set({ limit })}
        dense
        emptyMessage='No user is locked out of the sportsbook.'
      />
    </div>
  )
}

const Catalogue = () => (
  <div>
    <PageHeader title='Sports catalogue & locks' description='Who is locked out of betting. The sports and fancy markets offered come from the odds feed.' />
    <Tabs defaultValue='locks'>
      <TabsList className='mb-4'>
        <TabsTrigger value='locks'>Locked users</TabsTrigger>
        <TabsTrigger value='sports'>Sports</TabsTrigger>
        <TabsTrigger value='fancy'>Fancy controls</TabsTrigger>
      </TabsList>
      <TabsContent value='locks'>
        <Locks />
      </TabsContent>
      <TabsContent value='sports'>
        <Unavailable>
          The sports offered come straight from the odds feed; this backend has no per-sport catalogue to add, enable or remove sports.
        </Unavailable>
      </TabsContent>
      <TabsContent value='fancy'>
        <Unavailable>Fancy markets follow the odds feed; this backend keeps no per-market show/hide overrides to list or change.</Unavailable>
      </TabsContent>
    </Tabs>
  </div>
)

export default Catalogue
