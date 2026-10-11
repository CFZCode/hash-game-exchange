'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { ChevronRightIcon, PlusIcon } from 'lucide-react'

import Can from '@/components/shared/Can'
import DataTable, { type Column } from '@/components/shared/DataTable'
import FormDialog from '@/components/shared/FormDialog'
import { SelectField, TextField } from '@/components/shared/FormField'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSession } from '@/contexts/SessionContext'
import { useApi, useApiMutation, useListState, usePagedApi } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { ROLE_NAMES, STAFF_STATUSES, type StaffNode, type StaffRow } from './types'

/** Executives are created on the Executives screen (`/access/executives`), never from New staff. */
const EXECUTIVE_LEVEL = 7

/** "12.5%", or "—" when no share is set. */
const sharePct = (v: string | null | undefined) => (v === null || v === undefined || String(v).trim() === '' ? '—' : `${v}%`)

const YouBadge = () => (
  <Badge variant='outline' className='font-normal'>
    You
  </Badge>
)

/**
 * The list is the viewer's own subtree, the viewer included. Their own row is marked "You" and
 * opens nothing (no staff actions on yourself — My account is where you manage it), and its
 * "Reports to" is the viewer's parent, which is outside the subtree and so plain text, not a link.
 */
const columnsFor = (selfId: number | undefined): Column<StaffRow>[] => [
  {
    key: 'name',
    header: 'Name',
    cell: r => (
      <div className='flex flex-col'>
        {Number(r.id) === selfId ? (
          <span className='flex items-center gap-2 font-medium'>
            {r.name} <YouBadge />
          </span>
        ) : (
          <Link href={`/staff/${r.id}`} className='font-medium hover:underline'>
            {r.name}
          </Link>
        )}
        <span className='text-muted-foreground text-xs'>{r.email}</span>
      </div>
    )
  },
  { key: 'role', header: 'Role', cell: r => <Badge variant='secondary'>{ROLE_NAMES[r.roleId] ?? `role ${r.roleId}`}</Badge> },
  { key: 'status', header: 'Status', cell: r => <StatusBadge value={r.status} /> },
  { key: 'pct', header: 'Share %', align: 'right', cell: r => <span className='tabular-nums'>{sharePct(r.percentage)}</span> },
  {
    key: 'parent',
    header: 'Reports to',
    cell: r =>
      !r.parentId ? (
        <span className='text-muted-foreground'>—</span>
      ) : Number(r.id) === selfId ? (
        <span className='text-muted-foreground'>#{r.parentId}</span>
      ) : (
        <Link href={`/staff/${r.parentId}`} className='hover:underline'>
          #{r.parentId}
        </Link>
      )
  },
  { key: 'country', header: 'Country', cell: r => r.country ?? '—' },
  { key: 'id', header: 'ID', cell: r => <span className='font-mono text-xs'>#{r.id}</span> }
]

/** The roles New staff offers: strictly below the viewer's level, executives excluded. */
const creatableRoles = (level: number | undefined) =>
  Object.entries(ROLE_NAMES).filter(([l]) => Number(l) > (level ?? 99) && Number(l) !== EXECUTIVE_LEVEL)

const CreateStaff = () => {
  const { actor } = useSession()

  // A staff member can only create accounts strictly below their own level (the platform refuses
  // anything else): a super master offers master and agent; a master, agent. Executives are made
  // on the Executives screen, so level 7 is never offered here.
  const roles = creatableRoles(actor?.level)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', country: '', roleId: roles.some(([l]) => l === '6') ? '6' : (roles[0]?.[0] ?? '6'), percentage: '' })
  const router = useRouter()

  const create = useApiMutation({
    fn: () => {
      const body: Record<string, string | number> = { name: form.name, email: form.email, password: form.password, roleId: Number(form.roleId) }

      if (form.phone) body.phone = form.phone
      if (form.country) body.country = form.country
      if (form.percentage) body.percentage = form.percentage

      return api.post<{ id: number }>('admin/staff', body)
    },
    invalidate: [['paged', 'admin/staff'], ['api', 'admin/staff/tree']],
    success: 'Staff account created',
    onSuccess: r => r?.id && router.push(`/staff/${r.id}`)
  })

  return (
    <FormDialog
      trigger={
        <Button>
          <PlusIcon /> New staff
        </Button>
      }
      title='Create a staff account'
      description='The new account reports to you. Password must be at least 12 characters; they will be asked to change it on first sign-in.'
      submitLabel='Create'
      onSubmit={() => create.mutateAsync()}
    >
      <TextField id='s-name' label='Name' required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      <TextField id='s-email' label='Email' type='email' required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      <TextField id='s-password' label='Temporary password' type='password' required minLength={12} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
      <div className='grid grid-cols-2 gap-4'>
        <SelectField id='s-role' label='Role' value={form.roleId} onChange={roleId => setForm({ ...form, roleId })} options={roles.map(([v, l]) => ({ value: v, label: `${l} (level ${v})` }))} />
        <TextField id='s-pct' label='Share %' hint='0–100, up to 4 decimals' value={form.percentage} onChange={e => setForm({ ...form, percentage: e.target.value })} />
      </div>
      <div className='grid grid-cols-2 gap-4'>
        <TextField id='s-phone' label='Phone' value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        <TextField id='s-country' label='Country' value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
      </div>
    </FormDialog>
  )
}

/** Agents (level 6) hold no `staff:write`; anyone with no creatable level below them sees no button. */
const CreateStaffIfAllowed = () => {
  const { actor } = useSession()

  if (!actor || creatableRoles(actor.level).length === 0) return null

  return <CreateStaff />
}

const TreeNode = ({ node, depth, selfId }: { node: StaffNode; depth: number; selfId: number | undefined }) => (
  <div>
    <div className='hover:bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm' style={{ paddingLeft: depth * 20 + 8 }}>
      {node.children.length > 0 ? <ChevronRightIcon className='text-muted-foreground size-4 rotate-90' /> : <span className='size-4' />}
      {Number(node.id) === selfId ? (
        <span className='font-medium'>{node.name}</span>
      ) : (
        <Link href={`/staff/${node.id}`} className='font-medium hover:underline'>
          {node.name}
        </Link>
      )}
      {Number(node.id) === selfId && <YouBadge />}
      <Badge variant='secondary' className='font-normal'>
        {ROLE_NAMES[node.roleId] ?? node.roleId}
      </Badge>
      <StatusBadge value={node.status} />
      <span className='text-muted-foreground ml-auto tabular-nums'>{sharePct(node.percentage)}</span>
    </div>
    {node.children.map(c => (
      <TreeNode key={c.id} node={c} depth={depth + 1} selfId={selfId} />
    ))}
  </div>
)

const StaffTree = () => {
  const tree = useApi<StaffNode[]>('admin/staff/tree')
  const { actor } = useSession()

  return (
    <Card className='shadow-none'>
      <CardHeader>
        <CardTitle className='text-base'>Hierarchy</CardTitle>
      </CardHeader>
      <CardContent>
        {tree.isLoading && <Skeleton className='h-40' />}
        {tree.data?.map(n => (
          <TreeNode key={n.id} node={n} depth={0} selfId={actor ? Number(actor.staffId) : undefined} />
        ))}
      </CardContent>
    </Card>
  )
}

const StaffList = () => {
  const { state, set, query } = useListState(['status'])
  const list = usePagedApi<StaffRow>('admin/staff', { limit: query.limit, page: query.page, search: query.search, status: query.status })
  const { actor } = useSession()
  const columns = useMemo(() => columnsFor(actor ? Number(actor.staffId) : undefined), [actor])

  return (
    <div>
      <PageHeader
        title='Staff & agents'
        description='The agent hierarchy: super masters, masters, agents and executives, each reporting up one level.'
        actions={
          <Can permission='staff:write'>
            <CreateStaffIfAllowed />
          </Can>
        }
      />
      <Tabs defaultValue='list'>
        <TabsList className='mb-4'>
          <TabsTrigger value='list'>List</TabsTrigger>
          <TabsTrigger value='tree'>Tree</TabsTrigger>
        </TabsList>
        <TabsContent value='list'>
          <DataTable
            columns={columns}
            rows={list.data?.rows}
            rowKey={r => r.id}
            loading={list.isLoading}
            fetching={list.isFetching}
            error={list.error}
            pagination={list.data?.pagination}
            onPageChange={page => set({ page })}
            onLimitChange={limit => set({ limit })}
            search={String(state.search ?? '')}
            onSearchChange={search => set({ search })}
            searchPlaceholder='Name or email…'
            toolbar={
              <Select value={String(state.status || 'all')} onValueChange={v => v && set({ status: v === 'all' ? '' : v })}>
                <SelectTrigger className='w-40'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Any status</SelectItem>
                  {STAFF_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        </TabsContent>
        <TabsContent value='tree'>
          <StaffTree />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default StaffList
