'use client'

import Link from 'next/link'

import DataTable, { type Column } from '@/components/shared/DataTable'
import DateTime from '@/components/shared/DateTime'
import ErrorState from '@/components/shared/ErrorState'
import Money from '@/components/shared/Money'
import StatCard from '@/components/shared/StatCard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useApi } from '@/hooks/use-api'
import GeoAttribution from './GeoAttribution'
import { countryFlag } from './geo'
import type { PlayerRisk, RiskIp, RiskBet } from './types'

const FLAG_LABELS: Record<string, { label: string; tone: 'destructive' | 'outline' }> = {
  sharedIp: { label: 'Shares an IP', tone: 'destructive' },
  proxyOrHosting: { label: 'Proxy / VPN', tone: 'destructive' },
  multipleCountries: { label: 'Several countries', tone: 'destructive' },
  highWithdrawalRatio: { label: 'Withdraws > 90% of deposits', tone: 'destructive' },
  multipleIps: { label: 'Several IPs', tone: 'outline' },
  twoFaDisabled: { label: '2FA off', tone: 'outline' },
  noActivity: { label: 'No activity', tone: 'outline' }
}

const where = (r: { city?: string | null; region?: string | null; country?: string | null }) =>
  [r.city, r.region, r.country].filter(Boolean).join(', ')

const ipColumns: Column<RiskIp>[] = [
  {
    key: 'ip',
    header: 'IP',
    cell: r => (
      <span className='font-mono text-sm'>
        {r.ipAddress}
        {r.isPrivate && (
          <Badge variant='outline' className='ml-2 font-sans'>
            local
          </Badge>
        )}
      </span>
    )
  },
  { key: 'uses', header: 'Uses', align: 'right', cell: r => r.uses },
  {
    key: 'where',
    header: 'Location',
    cell: r => <span className='text-sm'>{where(r) || <span className='text-muted-foreground'>—</span>}</span>
  },
  { key: 'isp', header: 'Provider', cell: r => <span className='text-sm'>{r.isp ?? '—'}</span> },
  { key: 'first', header: 'First seen', cell: r => <DateTime value={r.firstSeen} /> },
  { key: 'last', header: 'Last seen', cell: r => <DateTime value={r.lastSeen} /> }
]

const betColumns: Column<RiskBet>[] = [
  { key: 'at', header: 'When', cell: r => <DateTime value={r.createdAt} /> },
  { key: 'stake', header: 'Stake', align: 'right', cell: r => <Money value={r.stakeAmount} currency={r.currency} /> },
  { key: 'status', header: 'Status', cell: r => <Badge variant='outline'>{r.resultStatus || r.status || '—'}</Badge> },
  { key: 'ip', header: 'IP', cell: r => <span className='font-mono text-sm'>{r.ipAddress ?? '—'}</span> }
]

/**
 * One player as a risk reviewer sees them: where the account was opened, every address it has
 * used, who else (in your tree) used those addresses, and money in and out. Lock changes stay on
 * the Locks button above, so this tab never duplicates them.
 */
const PlayerRiskTab = ({ userId }: { userId: string }) => {
  const q = useApi<PlayerRisk>(`admin/reports/user-risk/${userId}`)

  if (q.error) return <ErrorState error={q.error} />
  const d = q.data
  const reg = d?.registration
  const reward = d?.financials.reward
  const flags = Object.entries(d?.riskFlags ?? {}).filter(([k, on]) => on && FLAG_LABELS[k])
  const locks = d?.locks

  return (
    <div className='flex flex-col gap-4'>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard
          label='Registered from'
          loading={q.isLoading}
          value={
            <span>
              {countryFlag(reg?.countryCode)} {reg ? where(reg) || reg.ip || '—' : '—'}
            </span>
          }
          hint={
            reg?.source ? (
              <span className='flex flex-wrap items-center gap-1.5'>
                <span className='font-mono'>{reg.ip}</span>
                <Badge variant={reg.source === 'signup' ? 'secondary' : 'outline'}>
                  {reg.source === 'signup' ? 'at sign-up' : 'first login'}
                </Badge>
              </span>
            ) : (
              'not recorded'
            )
          }
        />
        <StatCard
          label='Distinct IPs'
          loading={q.isLoading}
          value={d?.activity.publicIpCount ?? 0}
          hint={
            d
              ? `${d.activity.distinctIpCount} with local addresses · ${d.activity.countries.length} countries`
              : undefined
          }
        />
        <StatCard
          label='Accounts sharing an IP'
          loading={q.isLoading}
          value={d?.sharedIps.total ?? 0}
          hint='Players in your tree on the same public address'
        />
        <StatCard
          label={`Net deposits (${reward?.currency ?? '—'})`}
          loading={q.isLoading}
          value={<Money value={reward?.net} currency={reward?.currency} />}
          hint={reward ? `${reward.depositCount} deposits · ${reward.withdrawalCount} withdrawals` : undefined}
        />
      </div>

      <Card className='shadow-none'>
        <CardHeader>
          <CardTitle className='text-sm'>Risk flags</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-wrap items-center gap-1.5'>
          {q.isLoading ? (
            <span className='text-muted-foreground text-sm'>Loading…</span>
          ) : flags.length ? (
            flags.map(([k]) => (
              <Badge key={k} variant={FLAG_LABELS[k].tone}>
                {FLAG_LABELS[k].label}
              </Badge>
            ))
          ) : (
            <span className='text-muted-foreground text-sm'>None</span>
          )}
          {locks && (
            <span className='text-muted-foreground ml-auto text-xs'>
              Locks:{' '}
              {[locks.isLocked && 'system', locks.casinoLocked && 'casino', locks.sportsBetlocked && 'sports']
                .filter(Boolean)
                .join(', ') || 'none'}{' '}
              · change them with the Locks button above
            </span>
          )}
        </CardContent>
      </Card>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <Card className='shadow-none'>
          <CardHeader>
            <CardTitle className='text-sm'>Money in and out ({reward?.currency ?? '…'})</CardTitle>
          </CardHeader>
          <CardContent className='grid grid-cols-3 gap-3 text-sm'>
            <div>
              <p className='text-muted-foreground text-xs'>Deposited</p>
              <Money value={reward?.totalDeposit} currency={reward?.currency} />
            </div>
            <div>
              <p className='text-muted-foreground text-xs'>Withdrawn</p>
              <Money value={reward?.totalWithdrawal} currency={reward?.currency} />
            </div>
            <div>
              <p className='text-muted-foreground text-xs'>Net</p>
              <Money value={reward?.net} currency={reward?.currency} />
            </div>
            <p className='text-muted-foreground col-span-3 text-xs'>
              Every deposit and withdrawal, all coins, valued in the site&apos;s reward currency at today&apos;s rates.
              {reward?.unconverted.length ? ` No rate for ${reward.unconverted.join(', ')}, left out.` : ''}
            </p>
          </CardContent>
        </Card>

        <Card className='shadow-none'>
          <CardHeader>
            <CardTitle className='text-sm'>Shares an IP with</CardTitle>
          </CardHeader>
          <CardContent className='text-sm'>
            {!d?.sharedIps.accounts.length ? (
              <span className='text-muted-foreground'>Nobody in your tree.</span>
            ) : (
              <ul className='flex flex-col gap-1.5'>
                {d.sharedIps.accounts.map(a => (
                  <li key={a.id} className='flex flex-wrap items-center gap-2'>
                    <Link href={`/users/${a.id}?tab=risk`} className='font-medium hover:underline'>
                      {a.name || `#${a.id}`}
                    </Link>
                    <span className='text-muted-foreground font-mono text-xs'>{a.ips.join(', ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className='mb-2 text-sm font-medium'>Addresses used</h3>
        <DataTable
          columns={ipColumns}
          rows={d?.activity.ipBreakdown}
          rowKey={r => r.ipAddress}
          loading={q.isLoading}
          dense
          emptyMessage='No logins recorded yet.'
        />
      </div>

      <div>
        <h3 className='mb-2 text-sm font-medium'>Recent bets with IP</h3>
        <DataTable
          columns={betColumns}
          rows={d?.activity.recentBets}
          rowKey={r => String(r.id)}
          loading={q.isLoading}
          dense
          emptyMessage='No sports bets. Casino rounds do not record an IP.'
        />
      </div>

      <GeoAttribution />
    </div>
  )
}

export default PlayerRiskTab
