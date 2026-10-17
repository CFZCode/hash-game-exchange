'use client'

import { useState } from 'react'

import Link from 'next/link'

import { ArrowLeftIcon, DownloadIcon, HandCoinsIcon, LockIcon, LockOpenIcon, NetworkIcon, PlusCircleIcon, PlusIcon, RefreshCwIcon, SettingsIcon } from 'lucide-react'

import DataTable, { type Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { useApi, useInvalidate, useListState } from '@/hooks/use-api'
import { accountTypeLabel } from '@/views/exchange/AccountList'
import { fmt } from '@/views/exchange/accountMoney'
import { exportExcel } from '@/views/exchange/exportList'
import FundsDialog, { type FundsKind } from '@/views/exchange/FundsDialog'
import MoreDialog from '@/views/exchange/MoreDialog'
import type { AccountRow, AccountsResponse } from '@/views/exchange/types'

/** Chhota rangeen chip (zip ke MUI Chip jaisa). */
const Chip = ({ on, yes, no }: { on: boolean; yes: string; no: string }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${on ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
    {on ? <LockIcon className='size-3' /> : <LockOpenIcon className='size-3' />}
    {on ? yes : no}
  </span>
)

const IconBtn = ({ title, className, onClick, children }: { title: string; className: string; onClick?: () => void; children: React.ReactNode }) => (
  <Button size='icon-sm' variant='ghost' title={title} aria-label={title} className={className} onClick={onClick}>
    {children}
  </Button>
)

/**
 * Agent System → Agent Listing — admin-structure.zip `AgentListingTab` ka UI, apne setup pe:
 *   list            `admin/exchange/accounts` (sirf direct children; naam / downline icon = drill-down)
 *   Create Agent    apna Create Account page (apne levels / flow)
 *   Deposit/Withdraw, Settlement   apna FundsDialog  ·  Settings   apna MoreDialog (profile, password, lock, credit history)
 * Paisa sirf apni list (top level) pe — downline me sirf dekhna, zip jaisa.
 */
const AgentListing = () => {
  const { state, set, query } = useListState(['parentId', 'parentName'])
  const limit = Number(query.limit ?? 20)
  const page = Number(query.page ?? 1)
  const parentId = query.parentId ? String(query.parentId) : undefined
  const [open, setOpen] = useState<{ row: AccountRow; kind: FundsKind } | null>(null)
  const invalidate = useInvalidate()

  const { data, isLoading, isFetching, error } = useApi<AccountsResponse>('admin/exchange/accounts', {
    limit,
    offset: (page - 1) * limit,
    search: query.search || undefined,
    parentId
  })

  const rows = data?.rows ?? []
  const total = data?.pagination.total ?? 0
  const drill = (r: AccountRow) => set({ parentId: r.accountId, parentName: r.username })

  const columns: Column<AccountRow>[] = [
    {
      key: 'username',
      header: 'Login Name',
      cell: r =>
        r.accountType === 'staff' ? (
          <button type='button' className='text-primary font-medium hover:underline' onClick={() => drill(r)}>
            {r.username}
          </button>
        ) : (
          <span className='font-medium'>{r.username}</span>
        )
    },
    { key: 'type', header: 'Account Type', cell: r => <span className='bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium'>{accountTypeLabel(r)}</span> },
    { key: 'balance', header: 'Balance', align: 'right', cell: r => <span className='font-semibold tabular-nums'>{fmt(r.available)}</span> },
    { key: 'credit', header: 'CR', align: 'right', cell: r => <span className='text-warning tabular-nums'>{fmt(r.credit)}</span> },
    { key: 'exposure', header: 'Net Exposure', align: 'right', cell: r => <span className={`tabular-nums ${Number(r.exposure) ? 'text-warning' : 'text-muted-foreground'}`}>{fmt(r.exposure)}</span> },
    { key: 'pct', header: 'Current %', cell: r => `${r.percentage ?? 1} Pt/ INR` },
    { key: 'bet', header: 'Betting Status', cell: r => <Chip on={r.betLocked} yes='Locked' no='Unlocked' /> },
    { key: 'status', header: 'Status', cell: r => <Chip on={r.userLocked} yes='Inactive' no='Active' /> },
    {
      key: 'pl',
      header: 'Client P/L',
      align: 'right',
      cell: r => <span className={`font-semibold tabular-nums ${Number(r.settlementPoints) >= 0 ? 'text-success' : 'text-danger'}`}>{fmt(r.settlementPoints)}</span>
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: r => (
        <div className='flex justify-center gap-0.5'>
          {!parentId && (
            <>
              <IconBtn title='Deposit / Withdraw' className='text-success' onClick={() => setOpen({ row: r, kind: 'dw' })}>
                <PlusCircleIcon />
              </IconBtn>
              <IconBtn title='Settlement' className='text-warning' onClick={() => setOpen({ row: r, kind: 'settle' })}>
                <HandCoinsIcon />
              </IconBtn>
            </>
          )}
          <MoreDialog
            row={r}
            profileOnly={Boolean(parentId)}
            trigger={
              <IconBtn title={parentId ? 'Profile' : 'Settings'} className='text-info'>
                <SettingsIcon />
              </IconBtn>
            }
          />
          {r.accountType === 'staff' && (
            <IconBtn title={`View ${r.username}'s downline`} className='text-foreground' onClick={() => drill(r)}>
              <NetworkIcon />
            </IconBtn>
          )}
        </div>
      )
    }
  ]

  const exportCsv = () =>
    exportExcel(
      'agents',
      ['Login Name', 'Account Type', 'Balance', 'CR', 'Exposure', 'Percentage', 'Bet', 'Status', 'Client P/L'],
      rows.map(r => [r.username, accountTypeLabel(r), r.available, r.credit, r.exposure, r.percentage ?? 1, r.betLocked ? 'Locked' : 'Unlocked', r.userLocked ? 'Inactive' : 'Active', r.settlementPoints])
    )

  return (
    <div className='grid gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          {parentId && (
            <Button variant='ghost' size='icon' aria-label='Back' onClick={() => set({ parentId: '', parentName: '' })}>
              <ArrowLeftIcon />
            </Button>
          )}
          <div>
            <h2 className='text-xl font-bold'>{parentId ? String(state.parentName || `#${parentId}`) : 'Agent Listing'}</h2>
            {parentId && <p className='text-muted-foreground text-xs'>Viewing {String(state.parentName || 'this account')}&apos;s downline — only they can deposit to or withdraw from these accounts.</p>}
          </div>
        </div>
        <div className='flex gap-2'>
          {data?.me && (
            <span className='bg-info/10 text-info flex items-center rounded-md px-3 text-sm'>
              {data.me.username}: <b className='ml-1 tabular-nums'>{fmt(data.me.balance)}</b>
            </span>
          )}
          <Button className='bg-success hover:bg-success/90 text-white' render={<Link href='/exchange/users/create' />} nativeButton={false}>
            <PlusIcon /> Create Agent
          </Button>
          <Button variant='ghost' size='icon' title='Export CSV' aria-label='Export CSV' disabled={!rows.length} onClick={exportCsv}>
            <DownloadIcon />
          </Button>
          <Button variant='ghost' size='icon' title='Refresh' aria-label='Refresh' onClick={() => invalidate(['api', 'admin/exchange/accounts'])}>
            <RefreshCwIcon />
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={r => `${r.accountType}-${r.accountId}`}
        loading={isLoading}
        fetching={isFetching}
        error={error}
        search={String(state.search ?? '')}
        onSearchChange={value => set({ search: value })}
        searchPlaceholder='Search by username…'
        emptyMessage='No agents found'
        pagination={{ page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1), hasNext: page * limit < total, hasPrev: page > 1 }}
        onPageChange={p => set({ page: p })}
        onLimitChange={l => set({ limit: l })}
      />
      {open && data && <FundsDialog kind={open.kind} row={open.row} me={data.me} open onOpenChange={o => !o && setOpen(null)} />}
    </div>
  )
}

export default AgentListing
