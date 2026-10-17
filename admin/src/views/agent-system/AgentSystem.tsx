'use client'

import { useState } from 'react'

import { PlusIcon } from 'lucide-react'

import Can from '@/components/shared/Can'
import TabbedPage, { type PageTab } from '@/components/shared/TabbedPage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useSession } from '@/contexts/SessionContext'
import { useApi } from '@/hooks/use-api'
import MyAccount from '@/views/account/MyAccount'
import { CreateSubLogin, GRANT, SubLoginTable } from '@/views/access/ExecutivesList'
import AuditLog from '@/views/audit/AuditLog'
import { fmt } from '@/views/exchange/accountMoney'
import OwnerAddBalance from '@/views/exchange/OwnerAddBalance'
import type { OwnerWallet } from '@/views/exchange/types'
import AgentListing from './AgentListing'
import Hierarchy from './Hierarchy'
import StaffPortal from './StaffPortal'

/** Executives / Marketing — zip jaisa header + apni `admin/access/*` table. */
const SubLogins = ({ kind, title, note }: { kind: 'executive' | 'marketing'; title: string; note: string }) => (
  <div className='grid gap-4'>
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <div>
        <h2 className='text-xl font-bold'>{title}</h2>
        <p className='text-muted-foreground text-sm'>{note}</p>
      </div>
      <Can permission={GRANT[kind]}>
        <CreateSubLogin kind={kind} />
      </Can>
    </div>
    <SubLoginTable kind={kind} />
  </div>
)

/** Owner ke do wallet (zip My Account ka "Add amount") — header wala Add Balance popup. */
const OwnerWalletCard = () => {
  const [open, setOpen] = useState(false)
  const { data } = useApi<OwnerWallet>('admin/exchange/owner/wallet')

  return (
    <Card className='mb-6 shadow-none'>
      <CardContent className='flex flex-wrap items-center gap-6 p-5'>
        <div>
          <div className='text-muted-foreground text-xs'>Agent System balance</div>
          <div className='text-xl font-bold tabular-nums'>₹{fmt(data?.wallet.balance ?? 0)}</div>
        </div>
        <div>
          <div className='text-muted-foreground text-xs'>Direct Users balance</div>
          <div className='text-xl font-bold tabular-nums'>₹{fmt(data?.directBalance ?? 0)}</div>
        </div>
        <Button className='ml-auto' onClick={() => setOpen(true)}>
          <PlusIcon /> Add Balance
        </Button>
        <OwnerAddBalance open={open} onOpenChange={setOpen} />
      </CardContent>
    </Card>
  )
}

const MyAccountTab = () => {
  const { can } = useSession()

  return (
    <div>
      {can('wallet:adjust') && <OwnerWalletCard />}
      <MyAccount />
    </div>
  )
}

/**
 * Agent System — admin-structure.zip `AdminManagement` ke tabs (Dashboard chhod ke):
 * Agent Listing, Staff Portal, My Account, Executives, Marketing, Hierarchy (zip Percentage Hierarchy, bina %), Activity Log.
 * UI zip jaisa, kaam apne Sports Exchange agent setup ki purani APIs se (koi API badli nahi).
 * Dashboard pehle se `/dashboard?tab=agent` pe hai.
 */
const AgentSystem = () => {
  const { can } = useSession()

  const tabs = ([
    can('users:read') || can('staff:read') ? { value: 'agents', label: 'Agent Listing', render: () => <AgentListing /> } : null,
    { value: 'staff-portal', label: 'Staff Portal', render: () => <StaffPortal /> },
    { value: 'myaccount', label: 'My Account', render: () => <MyAccountTab /> },
    can('staff:read') ? { value: 'executives', label: 'Executives', render: () => <SubLogins kind='executive' title='Executives' note='Sub-logins under your account with a subset of your permissions.' /> } : null,
    can('roles:manage') ? { value: 'marketing', label: 'Marketing', render: () => <SubLogins kind='marketing' title='Marketing Accounts' note='Read-only analytics logins.' /> } : null,
    can('users:read') || can('staff:read') ? { value: 'hierarchy', label: 'Hierarchy', render: () => <Hierarchy /> } : null,
    can('audit:read') ? { value: 'activity', label: 'Activity Log', render: () => <AuditLog /> } : null
  ] as (PageTab | null)[]).filter((t): t is PageTab => t !== null)

  return <TabbedPage tabs={tabs} />
}

export default AgentSystem
