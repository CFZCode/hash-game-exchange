'use client'

import { useState } from 'react'

import { GitBranchIcon } from 'lucide-react'

import { useApi } from '@/hooks/use-api'

type Node = {
  id: string
  name: string
  role: string
  level: number | null
  parentId: string | null
  status: string | null
  users: number
  depth: number
}

/** Apne levels (roles.level) ke rang — zip ke ROLE_COLORS jaisa. */
const LEVELS: { level: number; label: string; color: string }[] = [
  { level: 1, label: 'Super Admin', color: '#E01B4F' },
  { level: 2, label: 'Admin', color: '#2B6EF5' },
  { level: 3, label: 'Sub Admin', color: '#7B5EF5' },
  { level: 4, label: 'Super Master', color: '#FFC23F' },
  { level: 5, label: 'Master', color: '#0ECC68' },
  { level: 6, label: 'Agent', color: '#5581F7' }
]

const colorOf = (level: number | null) => LEVELS.find(l => l.level === level)?.color ?? '#8384A5'

/** Hex → rgba (zip ke `bg: rgba(...,0.15)`). */
const tint = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16)

  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

const line = 'bg-[#1E2D55]'

const FlowNode = ({ node, byParent, isRoot }: { node: Node; byParent: Map<string, Node[]>; isRoot?: boolean }) => {
  const kids = byParent.get(node.id) ?? []

  // Upline, main aur pehla downline khula; aage click se (zip jaisa).
  const [open, setOpen] = useState(node.depth < 2)
  const color = colorOf(node.level)

  return (
    <div className='flex flex-col items-center'>
      <div
        role={kids.length ? 'button' : undefined}
        tabIndex={kids.length ? 0 : undefined}
        onClick={() => kids.length && setOpen(o => !o)}
        className={`relative min-w-40 rounded-lg px-4 py-2.5 text-center transition-all ${kids.length ? 'cursor-pointer hover:brightness-125' : ''}`}
        style={{ background: tint(color, 0.15), border: `1.5px solid ${color}`, boxShadow: node.depth === 0 ? `0 0 12px ${color}66` : undefined }}
      >
        <div className='mb-0.5 text-[0.82rem] leading-tight font-semibold text-[#F9F9F9]'>{node.name}</div>
        <span className='inline-block rounded-full border px-2 text-[0.62rem] leading-4 font-semibold' style={{ color, borderColor: color }}>
          {node.role}
        </span>
        {(isRoot || node.depth === 0) && <div className='mt-0.5 text-[0.6rem] text-[#8384A5]'>{node.depth === 0 ? 'you' : 'root'}</div>}
        {kids.length > 0 && <span className='absolute top-1 right-1.5 size-1.5 rounded-full' style={{ background: open ? color : '#1E2D55' }} />}
      </div>

      {kids.length > 0 && open && (
        <>
          <div className={`h-6 w-0.5 ${line}`} />
          <div className='relative'>
            {kids.length > 1 && <div className={`absolute top-0 left-[10%] h-0.5 w-4/5 ${line}`} />}
            <div className='flex flex-wrap justify-center gap-8 pt-0.5'>
              {kids.map(c => (
                <div key={c.id} className='flex flex-col items-center'>
                  <div className={`h-4 w-0.5 ${line}`} />
                  {/* Zip me yahan % tha — apne setup me percentage nahi, users ki ginti */}
                  <div className='mb-1.5 rounded border border-[#1E2D55] bg-[#0E1831] px-1.5 py-0.5 text-[0.6rem] font-bold whitespace-nowrap text-[#8384A5]'>
                    {c.users} {c.users === 1 ? 'user' : 'users'}
                  </div>
                  <FlowNode node={c} byParent={byParent} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Agent System → Hierarchy — admin-structure.zip `PercentageHierarchyPage` jaisa tree
 * (upline → aap → downline, click se band / khula), apne levels ke naam / rang ke saath.
 * Percentage nahi dikhate; har node ke upar uske direct users ki ginti. API `admin/agent-hierarchy` (naya).
 */
const Hierarchy = () => {
  const { data, isLoading, error } = useApi<Node[]>('admin/agent-hierarchy')
  const nodes = data ?? []

  const ids = new Set(nodes.map(n => n.id))
  const byParent = new Map<string, Node[]>()
  const roots: Node[] = []

  for (const n of nodes) {
    if (n.parentId && ids.has(n.parentId)) byParent.set(n.parentId, [...(byParent.get(n.parentId) ?? []), n])
    else roots.push(n)
  }

  return (
    <div className='rounded-xl bg-[#0C0D1D] p-4 sm:p-6'>
      <div className='mx-auto max-w-[1400px]'>
        <div className='mb-6 flex items-center gap-3'>
          <span className='flex rounded-lg bg-[rgba(43,110,245,0.15)] p-2'>
            <GitBranchIcon className='size-[22px] text-[#2B6EF5]' />
          </span>
          <div>
            <h2 className='text-2xl font-bold text-[#F9F9F9]'>Agent Hierarchy</h2>
            <p className='text-xs text-[#8384A5]'>Your upline and downline — click any node to collapse</p>
          </div>
        </div>

        <div className='mb-6 flex flex-wrap gap-2'>
          {LEVELS.map(l => (
            <span key={l.level} className='rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold' style={{ color: l.color, borderColor: l.color, background: tint(l.color, 0.15) }}>
              {l.label}
            </span>
          ))}
        </div>

        <div className='min-h-52 overflow-auto rounded-xl border border-[#1E2D55] bg-[#0B1427] p-8'>
          {isLoading ? (
            <div className='flex justify-center gap-6'>
              {[...Array(3)].map((_, i) => (
                <div key={i} className='h-[70px] w-40 animate-pulse rounded-lg bg-[#1E2D55]' />
              ))}
            </div>
          ) : error ? (
            <p className='py-12 text-center text-[#E01B4F]'>{error.message || 'Failed to load'}</p>
          ) : roots.length === 0 ? (
            <div className='flex flex-col items-center py-12'>
              <GitBranchIcon className='size-10 text-[#1E2D55]' />
              <p className='mt-2 text-[#8384A5]'>No hierarchy data found.</p>
            </div>
          ) : (
            <div className='flex w-max min-w-full justify-center gap-12'>
              {roots.map(r => (
                <FlowNode key={r.id} node={r} byParent={byParent} isRoot />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Hierarchy
