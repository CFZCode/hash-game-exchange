'use client'

import TabbedPage, { type PageTab } from '@/components/shared/TabbedPage'
import { useSession } from '@/contexts/SessionContext'
import Hierarchy from './Hierarchy'
import StaffPortal from './StaffPortal'

/**
 * Agent System — admin-structure.zip `AdminManagement` ke woh tabs jo kahin aur nahi hain:
 * Staff Portal aur Hierarchy (zip Percentage Hierarchy, bina %).
 * Baaki tab bahar ke pages ki copy the, isliye hataye: Agent Listing = Agent Management → Account List,
 * Executives / Marketing = Team → Executives, Activity Log = Team → Activity log,
 * My Account (owner wallet card ke saath) = Settings → My account.
 */
const AgentSystem = () => {
  const { can } = useSession()

  const tabs = ([
    { value: 'staff-portal', label: 'Staff Portal', render: () => <StaffPortal /> },
    can('users:read') || can('staff:read') ? { value: 'hierarchy', label: 'Hierarchy', render: () => <Hierarchy /> } : null
  ] as (PageTab | null)[]).filter((t): t is PageTab => t !== null)

  return <TabbedPage tabs={tabs} />
}

export default AgentSystem
