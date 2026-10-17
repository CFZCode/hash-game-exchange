'use client'

import { useState, type ReactNode } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { ArrowLeftRightIcon, WalletIcon } from 'lucide-react'

import { useSession } from '@/contexts/SessionContext'
import CryptoDeposits from '@/views/finance/CryptoDeposits'
import CryptoWithdrawals from '@/views/finance/CryptoWithdrawals'
import FiatDeposits from '@/views/finance/FiatDeposits'
import FiatWithdrawals from '@/views/finance/FiatWithdrawals'
import PageHeader from '@/components/shared/PageHeader'
import PaymentOrders, { AllRails } from '@/views/finance/PaymentOrders'
import AgentLedger from './AgentLedger'
import ManualSwitch from './ManualSwitch'

type Part = { key: string; label: string; view: () => ReactNode }

/** Zip ka tab button (DepositPage / SelfDeposit ke tab bar jaisa). */
const tabClass = (active: boolean) =>
  `flex items-center gap-1.5 whitespace-nowrap border-b-2 px-5 py-3 text-[0.8rem] transition-colors ${
    active ? 'border-[#2B6EF5] bg-[rgba(43,110,245,0.08)] font-bold text-[#2B6EF5]' : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
  }`

/** Direct Users → zip ka "Crypto | Fiat" switcher; andar apne purane screens (unke actions ke saath). */
const DirectUsers = ({ parts }: { parts: Part[] }) => {
  const [key, setKey] = useState(parts[0].key)
  const active = parts.find(p => p.key === key) ?? parts[0]

  return (
    <div className='p-4'>
      <div className='mb-6 overflow-x-auto rounded-lg border border-border bg-card'>
        <div className='flex'>
          {parts.map(p => (
            <button key={p.key} type='button' className={tabClass(p.key === active.key)} onClick={() => setKey(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div key={active.key}>{active.view()}</div>
    </div>
  )
}

// Fiat = gateway (PSP) wale fiat deposits / payouts. Manual = player ka bank transfer (screenshot) /
// manual payout request; upar Super Admin ka ON / OFF. Dono alag data — ek list do jagah nahi.
const DEPOSIT_PARTS: Part[] = [
  { key: 'crypto', label: 'Crypto', view: () => <CryptoDeposits /> },
  { key: 'fiat', label: 'Fiat', view: () => <PaymentOrders /> },
  {
    key: 'manual',
    label: 'Manual',
    view: () => (
      <>
        <ManualSwitch kind='deposit' />
        <FiatDeposits />
      </>
    )
  }
]

const WITHDRAW_PARTS: Part[] = [
  { key: 'crypto', label: 'Crypto', view: () => <CryptoWithdrawals /> },
  {
    key: 'fiat',
    label: 'Fiat',
    view: () => (
      <>
        <PageHeader title='Fiat withdrawals' description='Gateway (PSP) payouts across every fiat rail.' />
        <AllRails kind='withdrawals' />
      </>
    )
  },
  {
    key: 'manual',
    label: 'Manual',
    view: () => (
      <>
        <ManualSwitch kind='withdraw' />
        <FiatWithdrawals />
      </>
    )
  }
]

/**
 * Transactions → Deposit / Withdraw — admin-structure.zip `DepositPage` / `WithdrawPage` jaisa:
 * upar tab bar "Direct Users" (Crypto / Fiat (gateway) / Manual (bank transfer + Super Admin ON/OFF)) aur
 * "Agent System" (Sports Exchange point ledger se agent ↔ player len-den, `admin/agent-ledger`).
 * Tab URL me `?tab=direct|agent`.
 */
const Transactions = ({ direction }: { direction: 'deposit' | 'withdraw' }) => {
  const { can } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const deposit = direction === 'deposit'

  const tabs = [
    can(deposit ? 'deposits:read' : 'withdrawals:read')
      ? { id: 'direct', label: 'Direct Users', icon: <WalletIcon className='size-4' />, view: () => <DirectUsers parts={deposit ? DEPOSIT_PARTS : WITHDRAW_PARTS} /> }
      : null,
    can('users:read') ? { id: 'agent', label: 'Agent System', icon: <ArrowLeftRightIcon className='size-4' />, view: () => <AgentLedger direction={direction} /> } : null
  ].filter(t => t !== null)

  if (!tabs.length) return <p className='p-6 text-sm text-muted-foreground'>You do not have access to this page.</p>

  const active = tabs.find(t => t.id === params.get('tab')) ?? tabs[0]

  return (
    <div className='overflow-hidden rounded-xl border border-border'>
      <div className='overflow-x-auto border-b border-border bg-card'>
        <div className='flex'>
          {tabs.map(t => (
            <button
              key={t.id}
              type='button'
              className={tabClass(t.id === active.id)}
              onClick={() => router.replace(t.id === tabs[0].id ? pathname : `${pathname}?tab=${t.id}`, { scroll: false })}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>
      <div key={active.id} className='min-h-[80vh] bg-background'>
        {active.view()}
      </div>
    </div>
  )
}

export default Transactions
