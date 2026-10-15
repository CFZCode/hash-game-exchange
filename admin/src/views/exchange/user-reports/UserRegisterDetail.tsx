'use client'

import { useState } from 'react'

import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePagedApi } from '@/hooks/use-api'
import { cn } from '@/lib/utils'
import { ClientSearch, ExportButtons, REPORTS_API, emptyText, filterRows } from './shared'

type Row = {
  id: string
  username: string
  agentName: string
  createdDate: string
  lastLogin: string
  firstDepositDate: string
  lastDepositDate: string
  deposit: string
  sportsBalance: number
  referralCode: string
}

/** Zip ka Type dropdown. */
const TYPES = [
  { value: '1', label: 'All' },
  { value: '2', label: 'Created Date' },
  { value: '3', label: 'Last Login Date' }
]

/** Balance ka rang zip jaisa: >= 0 hara, < 0 laal. */
const balanceClass = (value: number) => cn('block text-right tabular-nums', value < 0 ? 'text-destructive' : 'text-success')

const columns: Column<Row>[] = [
  { key: 'username', header: 'User Name', cell: r => r.username },
  { key: 'agentName', header: 'Agent Name', cell: r => r.agentName },
  { key: 'createdDate', header: 'Created Date', cell: r => r.createdDate },
  { key: 'lastLogin', header: 'Last Login', cell: r => r.lastLogin },
  { key: 'firstDepositDate', header: 'First Deposit Date', cell: r => r.firstDepositDate },
  { key: 'lastDepositDate', header: 'Last Deposit Date', cell: r => r.lastDepositDate },
  { key: 'deposit', header: 'Deposit', cell: r => r.deposit },
  { key: 'sportsBalance', header: 'Sports Balance', align: 'right', cell: r => <span className={balanceClass(r.sportsBalance)}>{r.sportsBalance}</span> },
  { key: 'referralCode', header: 'Referral Code', cell: r => r.referralCode }
]

const EXPORT_COLS = ['User Name', 'Agent Name', 'Created Date', 'Last Login', 'First Deposit Date', 'Last Deposit Date', 'Deposit', 'Sports Balance', 'Referral Code']

const exportRow = (r: Row) => [r.username, r.agentName, r.createdDate, r.lastLogin, r.firstDepositDate, r.lastDepositDate, r.deposit, r.sportsBalance, r.referralCode]

/**
 * User Register Detail — zip `reports/UserRegisterDetail.jsx`.
 * Naam (staff = uska poora downline, player = sirf wahi) aur Type chuno, Load dabao.
 */
const UserRegisterDetail = () => {
  const [clientName, setClientName] = useState('')
  const [type, setType] = useState('1')
  const [loaded, setLoaded] = useState<{ username: string; type: string } | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')

  const { data, isLoading, isFetching, error } = usePagedApi<Row>(loaded ? `${REPORTS_API}/register-detail` : null, {
    username: loaded?.username || undefined,
    type: loaded?.type,
    page,
    limit
  })

  const filtered = filterRows(loaded ? (data?.rows ?? []) : [], search)

  const handleReset = () => {
    setClientName('')
    setType('1')
    setSearch('')
    setPage(1)
    setLoaded(null)
  }

  return (
    <div className='flex flex-col gap-4'>
      <PageHeader title='User Register Detail' />

      <Card className='shadow-none'>
        <CardContent>
          <form
            className='grid items-end gap-3 md:grid-cols-[1fr_1fr_2fr]'
            onSubmit={e => {
              e.preventDefault()
              setPage(1)
              setLoaded({ username: clientName.trim(), type })
            }}
          >
            <div className='grid gap-1.5'>
              <Label>Search By Client Name</Label>
              <ClientSearch value={clientName} onChange={setClientName} />
            </div>
            <div className='grid gap-1.5'>
              <Label>Type</Label>
              <Select value={type} onValueChange={v => v && setType(v)}>
                <SelectTrigger className='w-full'>
                  <SelectValue>{(v: string) => TYPES.find(t => t.value === v)?.label ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button type='submit'>Load</Button>
              <Button type='button' variant='outline' onClick={handleReset}>
                Reset
              </Button>
              <ExportButtons fileName='userregisterdetail' title='User Register Detail' head={EXPORT_COLS} rows={filtered.map(exportRow)} />
            </div>
          </form>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={r => r.id}
        loading={Boolean(loaded) && isLoading}
        fetching={isFetching}
        error={error}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder='Search...'
        emptyMessage={emptyText(search)}
        pagination={data?.pagination}
        onPageChange={setPage}
        onLimitChange={l => {
          setLimit(l)
          setPage(1)
        }}
      />
    </div>
  )
}

export default UserRegisterDetail
