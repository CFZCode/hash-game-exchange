'use client'

import { useState } from 'react'

import Link from 'next/link'

import { LockIcon, SearchIcon } from 'lucide-react'

import Can from '@/components/shared/Can'
import DataTable, { type Column } from '@/components/shared/DataTable'
import ErrorState from '@/components/shared/ErrorState'
import FormDialog from '@/components/shared/FormDialog'
import { SelectField, TextField } from '@/components/shared/FormField'
import JsonView from '@/components/shared/JsonView'
import Money from '@/components/shared/Money'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
import StatusBadge from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useApi, useApiMutation } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { check } from '@/lib/validate'
import { formatNumber } from '@/lib/format'
import { LOCK_KINDS, type Exposure, type UserRisk } from './types'

const Flags = ({ flags, title = 'Risk flags' }: { flags: Record<string, boolean> | undefined; title?: string }) => (
  <Card className='shadow-none'>
    <CardHeader>
      <CardTitle className='text-base'>{title}</CardTitle>
    </CardHeader>
    <CardContent className='flex flex-wrap gap-2'>
      {flags && Object.keys(flags).length ? (
        Object.entries(flags).map(([k, v]) => (
          <Badge key={k} variant='outline' className={v ? 'border-transparent bg-red-500/15 text-red-700 dark:text-red-400' : 'text-muted-foreground'}>
            {k.replace(/([A-Z])/g, ' $1').toLowerCase()}: {v ? 'yes' : 'no'}
          </Badge>
        ))
      ) : (
        <span className='text-muted-foreground text-sm'>—</span>
      )}
    </CardContent>
  </Card>
)

const IdLookup = ({ label, onSubmit }: { label: string; onSubmit: (id: string) => void }) => {
  const [id, setId] = useState('')

  return (
    <form
      className='flex items-center gap-2'
      onSubmit={e => {
        e.preventDefault()
        if (id.trim()) onSubmit(id.trim())
      }}
    >
      <Input placeholder={label} className='w-48' value={id} onChange={e => setId(e.target.value.replace(/\D/g, ''))} />
      <Button type='submit' variant='outline' disabled={!id}>
        <SearchIcon /> Review
      </Button>
    </form>
  )
}

type LockChoice = 'unchanged' | 'lock' | 'unlock'

const LOCK_OPTIONS = [
  { value: 'unchanged', label: 'Leave as is' },
  { value: 'lock', label: 'Lock' },
  { value: 'unlock', label: 'Unlock' }
]

/** POST admin/locks — ek user (userId). Agent ke locks Sports Exchange me hain. */
const LocksDialog = ({ id: presetId }: { id?: string }) => {
  const [id, setId] = useState(presetId ?? '')
  const [choice, setChoice] = useState<Record<(typeof LOCK_KINDS)[number], LockChoice>>({ system: 'unchanged', casino: 'unchanged', sports: 'unchanged' })

  const apply = useApiMutation({
    fn: () => {
      const body: Record<string, number | boolean> = { userId: Number(id) }

      for (const k of LOCK_KINDS) if (choice[k] !== 'unchanged') body[k] = choice[k] === 'lock'

      return api.post('admin/locks', body)
    },
    invalidate: [['api', `admin/reports/user-risk/${id}`]],
    success: 'Locks updated'
  })

  return (
    <FormDialog
      trigger={
        <Button variant='outline'>
          <LockIcon /> Lock user
        </Button>
      }
      title='User locks'
      description='System lock blocks sign-in; casino and sports locks block betting in that area.'
      submitLabel='Apply'
      destructive={Object.values(choice).includes('lock')}
      onOpenChange={o => o && setId(presetId ?? id)}
      validate={() => {
        const idError = check.id(id, 'User id')

        if (idError) return { 'lk-user': idError }

        return LOCK_KINDS.some(k => choice[k] !== 'unchanged') ? null : 'Choose at least one lock to change'
      }}
      onSubmit={() => apply.mutateAsync()}
    >
      <TextField id='lk-user' label='User id' required value={id} onChange={e => setId(e.target.value.replace(/\D/g, ''))} />
      <div className='grid grid-cols-3 gap-3'>
        {LOCK_KINDS.map(k => (
          <SelectField key={k} id={`lk-user-${k}`} label={k} value={choice[k]} onChange={v => setChoice({ ...choice, [k]: v as LockChoice })} options={LOCK_OPTIONS} />
        ))}
      </div>
    </FormDialog>
  )
}

const UserRiskTab = () => {
  const [id, setId] = useState('')
  const risk = useApi<UserRisk>(id ? `admin/reports/user-risk/${id}` : null)
  const d = risk.data

  return (
    <div className='grid gap-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <IdLookup label='User id' onSubmit={setId} />
        <Can permission='users:write'>
          <LocksDialog id={id || undefined} />
        </Can>
      </div>
      {risk.error && <ErrorState error={risk.error} />}
      {d && (
        <>
          <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
            <StatCard label='User' value={<Link href={`/users/${d.user.id}`} className='hover:underline'>{d.user.name}</Link>} hint={d.user.email ?? `#${d.user.id}`} />
            <StatCard label='Agent' value={d.user.staffId ? (d.user.staffName ?? `#${d.user.staffId}`) : 'direct'} hint={d.user.lastIp ? `last IP ${d.user.lastIp}` : 'no login IP'} />
            <StatCard label='Deposits' value={<Money value={d.financials.totalDeposit} currency={d.currency} />} hint={<>withdrawals <Money value={d.financials.totalWithdrawal} /></>} />
            <StatCard label='Net' value={<Money value={d.financials.net} signed />} hint={`${formatNumber(d.activity.distinctIpCount)} distinct IPs`} />
          </div>
          <div className='grid gap-4 lg:grid-cols-2'>
            <Flags flags={d.riskFlags} />
            <Card className='shadow-none'>
              <CardHeader>
                <CardTitle className='text-base'>Locks</CardTitle>
              </CardHeader>
              <CardContent className='flex flex-wrap gap-2'>
                {Object.entries(d.locks).map(([k, v]) => (
                  <span key={k} className='flex items-center gap-1 text-sm'>
                    {k}: <StatusBadge value={v ? 'locked' : 'open'} />
                  </span>
                ))}
                <span className='ml-auto text-sm'>2FA: <StatusBadge value={d.user.twoFaEnabled} /></span>
              </CardContent>
            </Card>
          </div>
          <Tabs defaultValue='ips'>
            <TabsList className='mb-4'>
              <TabsTrigger value='ips'>IPs</TabsTrigger>
              <TabsTrigger value='logins'>Recent logins</TabsTrigger>
              <TabsTrigger value='bets'>Recent bets</TabsTrigger>
              <TabsTrigger value='raw'>Raw</TabsTrigger>
            </TabsList>
            <TabsContent value='ips'>
              <GenericTable rows={d.activity.ipBreakdown} />
            </TabsContent>
            <TabsContent value='logins'>
              <GenericTable rows={d.activity.recentLogins} />
            </TabsContent>
            <TabsContent value='bets'>
              <GenericTable rows={d.activity.recentBets} />
            </TabsContent>
            <TabsContent value='raw'>
              <JsonView value={d} className='max-h-[32rem]' />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

const GenericTable = ({ rows }: { rows: Record<string, unknown>[] | undefined }) => {
  const keys = rows?.length ? Object.keys(rows[0]) : []

  const columns: Column<Record<string, unknown>>[] = keys.map(k => ({
    key: k,
    header: k,
    cell: r => <span className='text-xs'>{typeof r[k] === 'object' && r[k] !== null ? JSON.stringify(r[k]) : String(r[k] ?? '—')}</span>
  }))

  return <DataTable columns={columns.length ? columns : [{ key: 'none', header: 'Rows', cell: () => null }]} rows={rows ?? []} rowKey={(r, i) => String(r.id ?? i)} dense />
}

const ExposureTab = () => {
  const exposure = useApi<Exposure>('admin/accounts/exposure/sports')

  return (
    <div className='grid gap-4'>
      {exposure.error && <ErrorState error={exposure.error} />}
      <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
        <StatCard label='Net sports exposure' value={<Money value={exposure.data?.total} />} hint='across your tree' loading={exposure.isLoading} />
        <StatCard label='Accounts exposed' value={formatNumber(exposure.data?.rows?.length)} loading={exposure.isLoading} />
      </div>
      <GenericTable rows={exposure.data?.rows} />
    </div>
  )
}

const RiskReview = () => (
  <div>
    <PageHeader title='Risk review' description='Exposure, velocity and flags for one user; net sports exposure; and account locks.' />
    <Tabs defaultValue='user'>
      <TabsList className='mb-4'>
        <TabsTrigger value='user'>User risk</TabsTrigger>
        <TabsTrigger value='exposure'>Net exposure</TabsTrigger>
      </TabsList>
      <TabsContent value='user'>
        <UserRiskTab />
      </TabsContent>
      <TabsContent value='exposure'>
        <ExposureTab />
      </TabsContent>
    </Tabs>
  </div>
)

export default RiskReview
