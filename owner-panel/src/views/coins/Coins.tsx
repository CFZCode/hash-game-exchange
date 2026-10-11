'use client'

import { useState } from 'react'

import { CoinsIcon, InfoIcon, Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import ErrorState from '@/components/shared/ErrorState'
import PageHeader from '@/components/shared/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { flagLabel } from '@/configs/entitlementCatalogue'
import { useApi, useApiMutation } from '@/hooks/use-api'
import { api, ApiError } from '@/lib/api/client'
import { COIN_KINDS, MAX_DECIMALS, cleanCoin, coinProblem, diffCoins, isBuiltinCoin } from '@/lib/entitlements/coins'
import { diffDocs, type Change, type CoinDefinition, type EditableDoc, type EntitlementsDoc, type SiteCoin, type ToggleChange } from '@/lib/entitlements/types'
import { cn } from '@/lib/utils'
import ChangeList from '../entitlements/ChangeList'

/** The crypto master flag: off = no crypto coin is in the plan, whatever each coin's own switch says. */
const MASTER = 'cryptocoin'

const flagOf = (code: string) => code.toLowerCase()

const CoinImage = ({ coin }: { coin: SiteCoin }) =>
  coin.imageUrl ? (
     
    <img src={coin.imageUrl} alt='' className='size-8 rounded-full object-contain' />
  ) : (
    <div className='bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full font-mono text-[10px] font-semibold'>{coin.code.slice(0, 3)}</div>
  )

type CoinForm = { code: string; name: string; symbol: string; kind: CoinDefinition['kind']; decimals: string; usdRate: string; networks: { key: string; name: string }[]; enabled: boolean }

const KIND_LABEL: Record<CoinDefinition['kind'], string> = { crypto: 'Crypto', fiat: 'Fiat', points: 'Points' }

const emptyForm = (): CoinForm => ({ code: '', name: '', symbol: '', kind: 'points', decimals: '2', usdRate: '', networks: [], enabled: true })

const formOf = (c: CoinDefinition): CoinForm => ({
  code: c.code,
  name: c.name,
  symbol: c.symbol ?? '',
  kind: c.kind,
  decimals: String(c.decimals ?? 8),
  usdRate: c.usdRate ?? '',
  networks: (c.networks ?? []).map(n => ({ ...n })),
  enabled: c.enabled !== false
})

const definitionOf = (f: CoinForm): CoinDefinition => ({
  code: f.code.trim().toUpperCase(),
  kind: f.kind,
  name: f.name,
  symbol: f.symbol,
  decimals: /^\d+$/.test(f.decimals.trim()) ? Number(f.decimals.trim()) : Number.NaN,
  usdRate: f.usdRate.trim(),
  networks: f.kind === 'crypto' ? f.networks.map(n => ({ key: n.key.trim(), name: n.name.trim() })) : [],
  enabled: f.enabled
})

/**
 * Add or edit one custom coin. The code is fixed once created (balances are keyed by it); the
 * coin is never deleted — the switch turns it off. Applying only stages the change: it is saved
 * with the rest through Review and save.
 */
const CoinDialog = ({
  open,
  editing,
  initial,
  taken,
  onClose,
  onApply
}: {
  open: boolean
  editing: boolean
  initial: CoinForm
  taken: (code: string) => boolean
  onClose: () => void
  onApply: (c: CoinDefinition) => void
}) => {
  const [form, setForm] = useState<CoinForm>(initial)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof CoinForm>(key: K, value: CoinForm[K]) => setForm(prev => ({ ...prev, [key]: value }))

  const apply = () => {
    const def = definitionOf(form)
    const problem = !editing && taken(def.code) ? `${def.code} already exists on this site` : coinProblem(def)

    if (problem) return setError(problem)
    onApply(cleanCoin(def))
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${form.code}` : 'Add a coin'}</DialogTitle>
          <DialogDescription>
            A site coin: balances, staff adjustments, swap (at the USD rate) and Vault Pro. No deposits, withdrawals, games or sports — it has no provider.
          </DialogDescription>
        </DialogHeader>
        <form
          className='flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1'
          onSubmit={e => {
            e.preventDefault()
            apply()
          }}
        >
          <div className='grid grid-cols-2 gap-3'>
            <Field>
              <FieldLabel htmlFor='coin-code'>Code</FieldLabel>
              <Input
                id='coin-code'
                name='code'
                value={form.code}
                disabled={editing}
                maxLength={10}
                autoComplete='off'
                placeholder='QAC'
                className='font-mono uppercase'
                onChange={e => set('code', e.target.value.toUpperCase())}
              />
              <FieldDescription>{editing ? 'Fixed once created.' : 'A capital letter, then 1–9 capitals or digits.'}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor='coin-kind'>Kind</FieldLabel>
              <Select items={COIN_KINDS.map(k => ({ value: k, label: KIND_LABEL[k] }))} value={form.kind} onValueChange={v => v && set('kind', v as CoinDefinition['kind'])}>
                <SelectTrigger id='coin-kind' className='w-full' aria-label='Kind'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COIN_KINDS.map(k => (
                    <SelectItem key={k} value={k}>
                      {KIND_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor='coin-name'>Name</FieldLabel>
              <Input id='coin-name' name='name' value={form.name} maxLength={60} placeholder='QA coin' onChange={e => set('name', e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor='coin-symbol'>Symbol</FieldLabel>
              <Input id='coin-symbol' name='symbol' value={form.symbol} maxLength={12} placeholder={form.code || 'QAC'} onChange={e => set('symbol', e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor='coin-decimals'>Decimals</FieldLabel>
              <Input id='coin-decimals' name='decimals' inputMode='numeric' value={form.decimals} onChange={e => set('decimals', e.target.value)} />
              <FieldDescription>0–{MAX_DECIMALS}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor='coin-rate'>USD rate</FieldLabel>
              <Input id='coin-rate' name='usdRate' inputMode='decimal' value={form.usdRate} placeholder='0.01' onChange={e => set('usdRate', e.target.value)} />
              <FieldDescription>USD value of 1 {form.code || 'unit'}; swap prices it here.</FieldDescription>
            </Field>
          </div>

          {form.kind === 'crypto' && (
            <Field>
              <FieldLabel>Networks</FieldLabel>
              <div className='flex flex-col gap-2'>
                {form.networks.map((n, i) => (
                  <div key={i} className='flex items-center gap-2'>
                    <Input
                      aria-label={`Network ${i + 1} key`}
                      value={n.key}
                      maxLength={20}
                      placeholder='TRC20'
                      className='font-mono'
                      onChange={e => set('networks', form.networks.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
                    />
                    <Input
                      aria-label={`Network ${i + 1} name`}
                      value={n.name}
                      maxLength={40}
                      placeholder='Tron'
                      onChange={e => set('networks', form.networks.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    />
                    <Button type='button' variant='ghost' size='icon' aria-label={`Remove network ${i + 1}`} onClick={() => set('networks', form.networks.filter((_, j) => j !== i))}>
                      <Trash2Icon />
                    </Button>
                  </div>
                ))}
                <Button type='button' variant='outline' size='sm' className='w-fit' disabled={form.networks.length >= 20} onClick={() => set('networks', [...form.networks, { key: '', name: '' }])}>
                  <PlusIcon /> Add network
                </Button>
              </div>
              <FieldDescription>Labels only for now: a custom coin has no deposit or withdrawal rail.</FieldDescription>
            </Field>
          )}

          <Field orientation='horizontal'>
            <Switch id='coin-enabled' checked={form.enabled} onCheckedChange={v => set('enabled', v)} />
            <FieldLabel htmlFor='coin-enabled'>{form.enabled ? 'On — in the plan' : 'Off — hidden from players'}</FieldLabel>
          </Field>

          {error && (
            <p role='alert' className='text-destructive text-sm'>
              {error}
            </p>
          )}
          <button type='submit' className='hidden' aria-hidden tabIndex={-1} />
        </form>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={apply}>{editing ? 'Apply changes' : 'Add coin'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * The owner's coins: which of the site's coins are in the plan. Each switch is the coin's flag in
 * the entitlement document (`flags.btc`, …) — the same flag the Features & plan screen lists —
 * and the crypto master `flags.cryptocoin`. The site's own switch, names, images and network
 * names are the site admin's; they are shown here read-only, as the site reports them.
 */
const Coins = () => {
  const { data: doc, error, isLoading, refetch } = useApi<EditableDoc>('/api/owner/entitlements')
  const site = useApi<{ coins: SiteCoin[]; source: 'site' | 'catalogue'; reason?: string }>('/api/owner/coins')
  const [edits, setEdits] = useState<Record<string, boolean>>({})
  const [coinDraft, setCoinDraft] = useState<CoinDefinition[] | null>(null)
  const [dialog, setDialog] = useState<{ editing: boolean; form: CoinForm; key: number } | null>(null)
  const [reviewing, setReviewing] = useState(false)

  const flags = doc ? { ...doc.flags, ...edits } : {}
  const savedCoins = doc?.coins ?? []
  const ownerCoins = coinDraft ?? savedCoins

  const changes: Change[] = doc
    ? [...diffDocs({ features: doc.features, flags: doc.flags }, { features: doc.features, flags }), ...diffCoins(savedCoins, ownerCoins)]
    : []

  const siteList = site.data?.coins ?? []

  // The site's coins, then any custom coin defined here that the site does not show yet.
  const coins: (SiteCoin & { pending?: boolean })[] = [
    ...siteList,
    ...ownerCoins
      .filter(c => !siteList.some(s => s.code === c.code))
      .map(c => ({
        code: c.code,
        kind: c.kind,
        name: c.name,
        symbol: c.symbol ?? c.code,
        builtin: false,
        retired: false,
        imageUrl: null,
        ownerEnabled: c.enabled !== false,
        siteEnabled: null,
        networks: c.networks ?? [],
        pending: true
      }))
  ]

  const definitionFor = (code: string) => ownerCoins.find(c => c.code === code)

  const stageCoin = (def: CoinDefinition) =>
    setCoinDraft(prev => {
      const list = prev ?? savedCoins

      return list.some(c => c.code === def.code) ? list.map(c => (c.code === def.code ? def : c)) : [...list, def]
    })

  const discard = () => {
    setEdits({})
    setCoinDraft(null)
  }

  const nameOf = (key: string) => coins.find(c => flagOf(c.code) === key)?.name ?? flagLabel(key)
  const labelOf = (c: ToggleChange) => (c.key === MASTER ? flagLabel(MASTER) : `${nameOf(c.key)} (${c.key.toUpperCase()})`)
  const on = (key: string) => flags[key] !== false
  const set = (key: string, value: boolean) => setEdits(prev => ({ ...prev, [key]: value }))

  const save = useApiMutation<void, { doc: EntitlementsDoc; changes: Change[]; live?: { live: boolean; reason?: string } }>({
    // Only the flags change; features, variants and the template stay as stored.
    fn: () => api.put('/api/owner/entitlements', { version: doc!.version, features: {}, flags: edits, ...(coinDraft ? { coins: coinDraft } : {}) }),
    invalidate: [['api']],
    success: r =>
      !r.changes.length
        ? 'Nothing to save'
        : r.live?.live
          ? `Saved as version ${r.doc.version} — live on the site now`
          : `Saved as version ${r.doc.version} — the backend picks it up on its next poll`,
    onSuccess: () => {
      discard()
      setReviewing(false)
    }
  })

  if (error) return <ErrorState error={error} />

  const changedKeys = new Set(changes.map(c => c.key))

  return (
    <div className={cn(changes.length > 0 && 'pb-20')}>
      <PageHeader
        title='Coins'
        description="Which of the site's coins are in the client's plan, and the site's own coins you create. Names, images, network names and the site's own switch are set in the site admin."
        actions={
          <Button variant='outline' disabled={!doc} onClick={() => setDialog({ editing: false, form: emptyForm(), key: Date.now() })}>
            <PlusIcon /> Add coin
          </Button>
        }
      />

      {site.data?.source === 'catalogue' && (
        <Alert className='mb-4'>
          <InfoIcon />
          <AlertTitle>The site did not answer</AlertTitle>
          <AlertDescription>
            Showing the coin flags from the catalogue without names or images ({site.data.reason ?? 'unreachable'}). Switches still save.
          </AlertDescription>
        </Alert>
      )}

      {isLoading || site.isLoading || !doc ? (
        <div className='flex flex-col gap-2'>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className='h-12 w-full' />
          ))}
        </div>
      ) : (
        <>
          <Card className='mb-4'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <CoinsIcon className='size-4' /> Crypto wallets (master)
              </CardTitle>
              <CardDescription>Off takes every crypto coin out of the plan; each coin&apos;s switch below still applies when it is on.</CardDescription>
            </CardHeader>
            <CardContent className='flex items-center gap-3' data-row={MASTER}>
              <Switch checked={on(MASTER)} onCheckedChange={v => set(MASTER, v)} aria-label='Crypto wallets (master)' />
              <span className='text-sm'>{on(MASTER) ? 'In the plan' : 'Not in the plan'}</span>
              {changedKeys.has(MASTER) && <Badge variant='outline'>changed</Badge>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className='p-0'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-12' />
                    <TableHead>Coin</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Networks</TableHead>
                    <TableHead>On the site</TableHead>
                    <TableHead className='text-right'>In the plan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coins.map(coin => {
                    const key = flagOf(coin.code)
                    const masterOff = coin.kind === 'crypto' && !on(MASTER)
                    const def = coin.builtin ? undefined : definitionFor(coin.code)
                    const changed = changedKeys.has(key) || changedKeys.has(coin.code)

                    return (
                      <TableRow key={coin.code} data-row={key} className={cn(changed && 'bg-muted/40')}>
                        <TableCell>
                          <CoinImage coin={coin} />
                        </TableCell>
                        <TableCell>
                          <div className='font-medium'>{coin.name}</div>
                          <div className='text-muted-foreground font-mono text-xs'>
                            {coin.code}
                            {coin.symbol && coin.symbol !== coin.code ? ` · ${coin.symbol}` : ''}
                            {def?.usdRate ? ` · $${def.usdRate}` : ''}
                          </div>
                          {!coin.builtin && (
                            <div className='mt-1 flex flex-wrap gap-1'>
                              <Badge variant='secondary'>Custom</Badge>
                              {coin.pending && <Badge variant='outline'>{savedCoins.some(c => c.code === coin.code) ? 'not on the site yet' : 'unsaved'}</Badge>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className='capitalize'>{coin.kind}</TableCell>
                        <TableCell>
                          <div className='flex flex-wrap gap-1'>
                            {coin.networks.length ? (
                              coin.networks.map(n => (
                                <Badge key={n.key} variant='secondary' title={n.key}>
                                  {n.name}
                                </Badge>
                              ))
                            ) : (
                              <span className='text-muted-foreground text-xs'>—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {coin.retired ? (
                            <Badge variant='outline'>Retired</Badge>
                          ) : coin.siteEnabled === null ? (
                            <span className='text-muted-foreground text-xs'>unknown</span>
                          ) : (
                            <Badge variant={coin.siteEnabled ? 'default' : 'outline'}>{coin.siteEnabled ? 'On' : 'Off'}</Badge>
                          )}
                        </TableCell>
                        <TableCell className='text-right'>
                          <div className='flex items-center justify-end gap-2'>
                            {masterOff && <span className='text-muted-foreground text-xs'>master off</span>}
                            {def && (
                              <Button
                                variant='ghost'
                                size='icon'
                                aria-label={`Edit ${coin.code}`}
                                onClick={() => setDialog({ editing: true, form: formOf(def), key: Date.now() })}
                              >
                                <PencilIcon />
                              </Button>
                            )}
                            {def ? (

                              // A custom coin's own switch is its definition's `enabled` — never deleted, only off.
                              <Switch
                                checked={def.enabled !== false && on(key)}
                                onCheckedChange={v => stageCoin({ ...def, enabled: v })}
                                aria-label={`${coin.name} in the plan`}
                              />
                            ) : (
                              <Switch
                                checked={!coin.retired && on(key)}
                                disabled={coin.retired}
                                onCheckedChange={v => set(key, v)}
                                aria-label={`${coin.name} in the plan`}
                              />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {changes.length > 0 && (
        <div className='bg-background/95 fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur'>
          <div className='mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-3'>
            <span className='text-sm'>
              {changes.length} unsaved change{changes.length === 1 ? '' : 's'}
            </span>
            <div className='flex gap-2'>
              <Button variant='outline' onClick={discard}>
                Discard
              </Button>
              <Button onClick={() => setReviewing(true)}>Review and save</Button>
            </div>
          </div>
        </div>
      )}

      {dialog && (
        <CoinDialog
          key={dialog.key}
          open
          editing={dialog.editing}
          initial={dialog.form}
          taken={code => isBuiltinCoin(code) || coins.some(c => c.code === code) || ownerCoins.some(c => c.code === code)}
          onClose={() => setDialog(null)}
          onApply={def => {
            stageCoin(def)
            setDialog(null)
          }}
        />
      )}

      <Dialog open={reviewing} onOpenChange={setReviewing}>
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Save coins</DialogTitle>
            <DialogDescription>
              Version {doc?.version} → {(doc?.version ?? 0) + 1}. The site picks this up within seconds.
            </DialogDescription>
          </DialogHeader>
          <div className='max-h-[60vh] overflow-y-auto'>
            <ChangeList changes={changes} labelOf={labelOf} />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setReviewing(false)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button
              disabled={save.isPending}
              onClick={() =>
                save.mutate(undefined, {
                  onError: e => {
                    if (e instanceof ApiError && e.code === 'VERSION_CONFLICT') {
                      toast.info('Reloaded the latest version; your edits are kept on top of it.')
                      void refetch()
                    }
                  }
                })
              }
            >
              {save.isPending && <Loader2Icon className='animate-spin' />} Save {changes.length} change{changes.length === 1 ? '' : 's'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Coins
