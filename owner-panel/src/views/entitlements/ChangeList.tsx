import { ArrowRightIcon } from 'lucide-react'

import StatusBadge from '@/components/shared/StatusBadge'
import { featureLabel, isPolicy, optionLabel, variantLabel } from '@/configs/entitlementCatalogue'
import { templateLabel } from '@/configs/templateCatalogue'
import { Badge } from '@/components/ui/badge'
import type { Change, CoinChange, CoinDefinition, ToggleChange } from '@/lib/entitlements/types'

const coinFacts = (c: CoinDefinition) =>
  `${c.kind}, ${c.decimals ?? 8} dp, $${c.usdRate ?? '?'}${c.networks?.length ? `, ${c.networks.map(n => n.key).join('/')}` : ''}${c.enabled === false ? ', off' : ''}`

/** "points, 2 dp, $0.01" for a new coin; the fields that moved for an edit. */
function coinSummary(c: CoinChange) {
  if (!c.from) return coinFacts(c.to)
  const moved: string[] = []

  if (c.from.name !== c.to.name) moved.push(`name ${c.from.name} → ${c.to.name}`)
  if ((c.from.symbol ?? '') !== (c.to.symbol ?? '')) moved.push(`symbol ${c.from.symbol || '—'} → ${c.to.symbol || '—'}`)
  if (c.from.kind !== c.to.kind) moved.push(`kind ${c.from.kind} → ${c.to.kind}`)
  if (c.from.decimals !== c.to.decimals) moved.push(`decimals ${c.from.decimals} → ${c.to.decimals}`)
  if (c.from.usdRate !== c.to.usdRate) moved.push(`rate $${c.from.usdRate} → $${c.to.usdRate}`)
  const nets = (d: CoinDefinition) => (d.networks ?? []).map(n => `${n.key}:${n.name}`).join(',')

  if (nets(c.from) !== nets(c.to)) moved.push(`networks ${(c.from.networks ?? []).map(n => n.key).join('/') || '—'} → ${(c.to.networks ?? []).map(n => n.key).join('/') || '—'}`)
  if (c.from.enabled !== c.to.enabled) moved.push(c.to.enabled === false ? 'off' : 'on')

  return moved.join('; ')
}

/**
 * One line per change: the template as "Template: A → B"; a variant or policy as
 * "Gift cards: Activate-then-claim cards → Off" (keys beside it); a feature on → off;
 * a flag entitled → blocked (or back).
 */
const ChangeList = ({ changes, labelOf }: { changes: Change[]; labelOf: (c: ToggleChange) => string }) => (
  <ul className='flex flex-col gap-1.5'>
    {changes.map(c =>
      c.kind === 'template' ? (
        <li key='template' className='flex flex-wrap items-center gap-2 text-sm'>
          <span className='text-muted-foreground w-14 text-xs uppercase'>site</span>
          <span className='font-medium'>
            Template: {templateLabel(c.from)} → {templateLabel(c.to)}
          </span>
        </li>
      ) : c.kind === 'variant' ? (
        <li key={`variant:${c.key}`} className='flex flex-wrap items-center gap-2 text-sm'>
          <span className='text-muted-foreground w-14 text-xs uppercase'>{isPolicy(c.key) ? 'policy' : 'variant'}</span>
          <span className='font-medium'>
            {featureLabel(c.key)}: {variantLabel(c.key, c.from)} → {variantLabel(c.key, c.to)}
          </span>
          <span className='text-muted-foreground font-mono text-xs'>
            {c.from ?? '—'} → {c.to}
          </span>
        </li>
      ) : c.kind === 'coin' ? (
        <li key={`coin:${c.key}`} className='flex flex-wrap items-center gap-2 text-sm'>
          <span className='text-muted-foreground w-14 text-xs uppercase'>coin</span>
          <span className='font-medium'>
            {c.to.name} ({c.key})
          </span>
          <Badge variant={c.action === 'disabled' ? 'outline' : 'secondary'}>
            {c.action === 'added' ? 'new coin' : c.action === 'edited' ? 'edited' : c.action === 'enabled' ? 'switched on' : 'switched off'}
          </Badge>
          <span className='text-muted-foreground font-mono text-xs'>{coinSummary(c)}</span>
        </li>
      ) : c.kind === 'option' ? (
        <li key={`option:${c.key}`} className='flex flex-wrap items-center gap-2 text-sm'>
          <span className='text-muted-foreground w-14 text-xs uppercase'>option</span>
          <span className='font-medium'>{optionLabel(c.key)}</span>
          <span className='text-muted-foreground font-mono text-xs'>{c.key}</span>
          <StatusBadge value={c.from ? 'enabled' : 'disabled'} />
          <ArrowRightIcon className='text-muted-foreground size-3.5' />
          <StatusBadge value={c.to ? 'enabled' : 'disabled'} />
        </li>
      ) : c.kind === 'coins' ? (
        <li key='coins' className='flex flex-wrap items-center gap-2 text-sm'>
          <span className='text-muted-foreground w-14 text-xs uppercase'>coins</span>
          <span className='font-medium'>Custom coins</span>
          <span className='text-muted-foreground font-mono text-xs'>
            {c.from.join(', ') || '—'} → {c.to.join(', ') || '—'}
          </span>
        </li>
      ) : (
        <li key={`${c.kind}:${c.key}`} className='flex flex-wrap items-center gap-2 text-sm'>
          <span className='text-muted-foreground w-14 text-xs uppercase'>{c.kind}</span>
          <span className='font-medium'>{labelOf(c)}</span>
          <span className='text-muted-foreground font-mono text-xs'>{c.key}</span>
          {c.kind === 'feature' ? (
            <>
              <StatusBadge value={c.from ? 'enabled' : 'disabled'} />
              <ArrowRightIcon className='text-muted-foreground size-3.5' />
              <StatusBadge value={c.to ? 'enabled' : 'disabled'} />
            </>
          ) : (
            <>
              <StatusBadge value={c.from ? 'entitled' : 'blocked'} />
              <ArrowRightIcon className='text-muted-foreground size-3.5' />
              <StatusBadge value={c.to ? 'entitled' : 'blocked'} />
            </>
          )}
        </li>
      )
    )}
  </ul>
)

export default ChangeList
