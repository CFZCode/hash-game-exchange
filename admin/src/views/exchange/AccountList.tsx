'use client'

import Link from 'next/link'

import { FileSpreadsheetIcon, FileTextIcon, PlusIcon } from 'lucide-react'

import DataTable, { type Column } from '@/components/shared/DataTable'
import PageHeader from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useApi, useListState } from '@/hooks/use-api'
import { fmt } from './accountMoney'
import CreditDialog from './CreditDialog'
import { exportExcel, exportPdf } from './exportList'
import MoreDialog from './MoreDialog'
import type { AccountRow, AccountsResponse } from './types'

/** Zip ke "Account Type" label: User, Agent, Master … */
export const accountTypeLabel = (row: AccountRow) => (row.accountType === 'user' ? 'User' : row.role)

const lockSwitch = (on: boolean) => <Switch checked={on} disabled aria-label={on ? 'Locked' : 'Not locked'} />

/**
 * Account List — zip ka `users/Users.jsx`.
 *
 * Sirf DIRECT children. Staff ke naam pe click = uske children (drill-down, sirf dekhna — wahan
 * D/W nahi, sirf "P"). D / W = Credit Deposit / Credit Withdraw (`admin/staff/transfer`).
 */
const AccountList = () => {
  const title = 'Account List'
  const { state, set, query } = useListState(['parentId'])
  const limit = Number(query.limit ?? 20)
  const page = Number(query.page ?? 1)
  const parentId = query.parentId || undefined

  const { data, isLoading, isFetching, error } = useApi<AccountsResponse>('admin/exchange/accounts', {
    limit,
    offset: (page - 1) * limit,
    search: query.search || undefined,
    parentId
  })

  const rows = data?.rows ?? []
  const total = data?.pagination.total ?? 0

  const userName: Column<AccountRow> = {
    key: 'username',
    header: 'User Name',
    cell: r =>
      r.accountType === 'staff' ? (
        <Link href={`?parentId=${r.accountId}`} className='text-primary underline-offset-2 hover:underline' title={r.username}>
          {r.username}
        </Link>
      ) : (
        <span title={r.username}>{r.username}</span>
      )
  }

  const cr: Column<AccountRow> = {
    key: 'cr',
    header: 'CR',
    align: 'right',

    // Sirf number — deposit / withdraw Action ke D / W se.
    cell: r => <span className='text-warning block text-right tabular-nums'>{fmt(r.credit)}</span>
  }

  const action: Column<AccountRow> = {
    key: 'action',
    header: 'Action',
    cell: r =>
      parentId ? (

        // Drill-down list sirf dekhne ke liye: D/W nahi, More ki jagah "P".
        <MoreDialog row={r} profileOnly trigger={<Button size='sm' variant='secondary'>P</Button>} />
      ) : (
        <div className='flex gap-1'>
          {data && (
            <>
              <CreditDialog mode='deposit' row={r} me={data.me} trigger={<Button size='sm' className='bg-success text-white hover:bg-success/90'>D</Button>} />
              <CreditDialog mode='withdraw' row={r} me={data.me} trigger={<Button size='sm' variant='destructive'>W</Button>} />
            </>
          )}
          <MoreDialog row={r} trigger={<Button size='sm' variant='secondary'>More</Button>} />
        </div>
      )
  }

  const tail: Column<AccountRow>[] = [
    { key: 'bst', header: 'B st', cell: r => lockSwitch(r.betLocked) },
    { key: 'ust', header: 'U st', cell: r => lockSwitch(r.userLocked) },
    { key: 'pname', header: 'PName', cell: r => `${r.percentage ?? 1} Pt/ INR` },
    { key: 'type', header: 'Account Type', cell: r => accountTypeLabel(r) },
    action
  ]

  const columns: Column<AccountRow>[] = [userName, cr, ...tail]

  // Export — zip jaisa: wahi columns, raw numbers.
  const exportHead = ['User Name', 'CR', 'B st', 'U st', 'PName', 'Account Type']

  const exportRows = () =>
    rows.map(r => {
      const locks = [r.betLocked ? 'Locked' : 'Open', r.userLocked ? 'Locked' : 'Open', `${r.percentage ?? 1} Pt/ INR`, accountTypeLabel(r)]

      return [r.username, r.credit, ...locks]
    })

  const fileName = 'userlist'

  return (
    <div>
      <PageHeader
        title={title}
        description={parentId ? 'Downline of the selected account (view only).' : 'Your direct accounts. D / W deposits or withdraws credit.'}
        actions={
          <div className='flex flex-wrap gap-2'>
            {parentId && (
              <Button variant='outline' onClick={() => set({ parentId: '', page: 1 })}>
                Back to my list
              </Button>
            )}
            <Button variant='outline' size='icon' disabled={!rows.length} onClick={() => exportExcel(fileName, exportHead, exportRows())} aria-label='Excel'>
              <FileSpreadsheetIcon />
            </Button>
            <Button variant='outline' size='icon' disabled={!rows.length} onClick={() => exportPdf(fileName, title, exportHead, exportRows())} aria-label='PDF'>
              <FileTextIcon />
            </Button>
            <Button render={<Link href='/exchange/users/create' />} nativeButton={false}>
              <PlusIcon /> Create Account
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={r => `${r.accountType}-${r.accountId}`}
        loading={isLoading}
        fetching={isFetching}
        error={error}
        search={String(state.search ?? '')}
        onSearchChange={value => set({ search: value, page: 1 })}
        searchPlaceholder='Search User'
        emptyMessage='There are no records to show'
        pagination={{ page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1), hasNext: page * limit < total, hasPrev: page > 1 }}
        onPageChange={p => set({ page: p })}
        onLimitChange={l => set({ limit: l, page: 1 })}
      />
    </div>
  )
}

export default AccountList
