'use client'

import { useRef, useState } from 'react'

import { ImageIcon, Loader2Icon, Trash2Icon, UploadIcon } from 'lucide-react'
import { toast } from 'sonner'

import ErrorState from '@/components/shared/ErrorState'
import PageHeader from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useApi, useApiMutation } from '@/hooks/use-api'
import { api, ApiError } from '@/lib/api/client'
import {
  BRANDING_LABELS,
  brandingProblem,
  diffBranding,
  keywordList,
  MAX_IMAGE_BYTES,
  MAX_KEYWORDS,
  TEXT_LIMITS,
  type Branding as BrandingDoc,
  type BrandingAsset,
  type BrandingSlot,
  type BrandingTextKey
} from '@/lib/entitlements/branding'
import type { Change, EditableDoc, EntitlementsDoc } from '@/lib/entitlements/types'
import { cn } from '@/lib/utils'
import ChangeList from '../entitlements/ChangeList'

const assetUrl = (a: BrandingAsset | null) => (a ? `/api/owner/branding/asset/${a.file}` : null)

/** `{ success, data }` from the multipart upload (the JSON client does not send FormData). */
async function upload(slot: BrandingSlot, file: File): Promise<BrandingAsset> {
  const body = new FormData()

  body.set('file', file)
  const res = await fetch(`/api/owner/branding/upload?slot=${slot}`, { method: 'POST', body, cache: 'no-store' })
  const json = (await res.json().catch(() => null)) as { success: boolean; data?: BrandingAsset; error?: { code: string; message: string } } | null

  if (!json?.success || !json.data) throw new ApiError(res.status, json?.error?.code ?? 'BAD_RESPONSE', json?.error?.message ?? res.statusText)

  return json.data
}

const SLOT_HELP: Record<BrandingSlot, string> = {
  logo: 'The wordmark in the header, footer, region pop-up, bet slip and the house provider row. Drawn in the 4.5:1 box the original wordmark fills (288x64; upload 576x128 for sharp screens). Transparent, light ink for the dark theme.',
  mark: 'Square: the favicon, the signed-in mobile header and the loading screen. 128x128 or larger.',
  ogImage: 'The picture a shared link shows (1200x630 is the usual size). Optional.'
}

const ImageSlot = ({ slot, value, onChange }: { slot: BrandingSlot; value: BrandingAsset | null; onChange: (a: BrandingAsset | null) => void }) => {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const url = assetUrl(value)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)

    try {
      onChange(await upload(slot, file))
      toast.success(`${BRANDING_LABELS[slot]} uploaded — save to put it live`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <Field>
      <FieldLabel>{BRANDING_LABELS[slot]}</FieldLabel>
      <div className='flex flex-wrap items-center gap-3'>
        {/* On the site's dark header colour and on white, so a logo that vanishes on one shows. */}
        <div className={cn('flex items-center gap-2', slot === 'mark' ? '' : 'flex-col items-start sm:flex-row')}>
          {['#232626', '#FFFFFF'].map(bg => (
            <div
              key={bg}
              className={cn('flex items-center justify-center rounded-md border', slot === 'logo' ? 'h-14 w-48' : slot === 'mark' ? 'size-14' : 'h-16 w-32')}
              style={{ background: bg }}
            >
              {url ? (
                 
                <img src={url} alt='' className={cn('object-contain', slot === 'logo' ? 'h-8 w-36' : slot === 'mark' ? 'size-9' : 'max-h-14 max-w-28')} />
              ) : (
                <ImageIcon className='text-muted-foreground size-5' />
              )}
            </div>
          ))}
        </div>
        <div className='flex flex-col gap-1.5'>
          <div className='flex gap-2'>
            <Button type='button' variant='outline' size='sm' disabled={busy} onClick={() => input.current?.click()}>
              {busy ? <Loader2Icon className='animate-spin' /> : <UploadIcon />} {value ? 'Replace' : 'Upload'}
            </Button>
            {value && (
              <Button type='button' variant='ghost' size='sm' onClick={() => onChange(null)} aria-label={`Remove ${BRANDING_LABELS[slot]}`}>
                <Trash2Icon /> Remove
              </Button>
            )}
          </div>
          {value && (
            <span className='text-muted-foreground font-mono text-xs'>
              {value.type.replace('image/', '').replace('+xml', '')} · {value.width && value.height ? `${value.width}x${value.height} · ` : ''}
              {(value.bytes / 1024).toFixed(1)} KB · {value.file.slice(0, 10)}…
            </span>
          )}
        </div>
      </div>
      <input
        ref={input}
        type='file'
        className='hidden'
        accept='image/png,image/webp,image/svg+xml,.png,.webp,.svg'
        aria-label={`${BRANDING_LABELS[slot]} file`}
        data-slot={slot}
        onChange={e => void pick(e.target.files?.[0])}
      />
      <FieldDescription>
        {SLOT_HELP[slot]} PNG, WebP or SVG, at most {MAX_IMAGE_BYTES[slot] / 1024} KB. Checked by its bytes; an SVG with script, event attributes or external references is refused.
      </FieldDescription>
    </Field>
  )
}

type TextFieldProps = { name: BrandingTextKey; value: string; onChange: (v: string) => void; placeholder?: string; help?: string; multiline?: boolean }

const TextField = ({ name, value, onChange, placeholder, help, multiline }: TextFieldProps) => {
  const id = `branding-${name}`
  const Control = multiline ? Textarea : Input

  return (
    <Field>
      <div className='flex items-baseline justify-between gap-2'>
        <FieldLabel htmlFor={id}>{BRANDING_LABELS[name]}</FieldLabel>
        <span className={cn('text-xs tabular-nums', value.length > TEXT_LIMITS[name] ? 'text-destructive' : 'text-muted-foreground')}>
          {value.length}/{TEXT_LIMITS[name]}
        </span>
      </div>
      <Control id={id} name={name} value={value} placeholder={placeholder} autoComplete='off' onChange={e => onChange(e.target.value)} />
      {help && <FieldDescription>{help}</FieldDescription>}
    </Field>
  )
}

/**
 * The site's name, page metadata and logo files. Saved in the entitlements document
 * (`branding`) like every owner change: Review and save → new version → audit → the site pulls
 * it within seconds. Uploads are stored here and only go live with the save.
 */
const Branding = () => {
  const { data: doc, error, isLoading, refetch } = useApi<EditableDoc>('/api/owner/entitlements')
  const [draft, setDraft] = useState<BrandingDoc | null>(null)
  const [keywordsText, setKeywordsText] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)

  const saved = doc?.branding ?? null
  const current: BrandingDoc | null = draft ?? saved
  const changes: Change[] = saved && current ? diffBranding(saved, current) : []
  const problem = current ? brandingProblem(current) : null

  const set = <K extends keyof BrandingDoc>(key: K, value: BrandingDoc[K]) => setDraft(prev => ({ ...(prev ?? saved!), [key]: value }))

  const discard = () => {
    setDraft(null)
    setKeywordsText(null)
  }

  const save = useApiMutation<void, { doc: EntitlementsDoc; changes: Change[]; live?: { live: boolean; reason?: string } }>({
    // Only `branding` changes; features, flags, variants and the template stay as stored.
    fn: () => api.put('/api/owner/entitlements', { version: doc!.version, features: {}, flags: {}, branding: current }),
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

  const pageTitle = current?.title || current?.siteName || ''
  const sample = current?.titleTemplate ? current.titleTemplate.replace('%s', 'Casino') : pageTitle

  return (
    <div className={cn(changes.length > 0 && 'pb-20')}>
      <PageHeader
        title='Branding'
        description="The site's name, its page title and meta tags, and the logo files players see. The site admin shows them read-only. An empty field keeps the UI's own."
      />

      {isLoading || !current ? (
        <div className='flex flex-col gap-2'>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className='h-12 w-full' />
          ))}
        </div>
      ) : (
        <div className='grid gap-4 lg:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>Name and page metadata</CardTitle>
              <CardDescription>The browser tab, search results and the site&apos;s own mentions of its name.</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
              <TextField name='siteName' value={current.siteName} onChange={v => set('siteName', v)} placeholder='jumboflush' help='Required once branded. Also the alt text of the logo.' />
              <TextField name='title' value={current.title} onChange={v => set('title', v)} placeholder='Jumbo Flush — Casino & Sports' help='The home page title (and the default for every page).' />
              <TextField
                name='titleTemplate'
                value={current.titleTemplate}
                onChange={v => set('titleTemplate', v)}
                placeholder='%s · Jumbo Flush'
                help='How a page with its own title is named; %s is that title. Empty = the page title alone.'
              />
              <TextField name='description' value={current.description} onChange={v => set('description', v)} multiline help='<meta name="description">, shown under the title in search results.' />
              <Field>
                <div className='flex items-baseline justify-between gap-2'>
                  <FieldLabel htmlFor='branding-keywords'>{BRANDING_LABELS.keywords}</FieldLabel>
                  <span className='text-muted-foreground text-xs tabular-nums'>
                    {current.keywords.length}/{MAX_KEYWORDS}
                  </span>
                </div>
                <Input
                  id='branding-keywords'
                  name='keywords'
                  autoComplete='off'
                  placeholder='crypto casino, sports betting, originals'
                  value={keywordsText ?? current.keywords.join(', ')}
                  onChange={e => {
                    setKeywordsText(e.target.value)
                    set('keywords', keywordList(e.target.value))
                  }}
                />
                <FieldDescription>Comma-separated.</FieldDescription>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logo and icons</CardTitle>
              <CardDescription>Only the image changes: each one is drawn in the original&apos;s box, at the same size and place.</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-5'>
              <ImageSlot slot='logo' value={current.logo} onChange={a => set('logo', a)} />
              <ImageSlot slot='mark' value={current.mark} onChange={a => set('mark', a)} />
              <Field>
                <FieldLabel htmlFor='branding-themeColor'>{BRANDING_LABELS.themeColor}</FieldLabel>
                <div className='flex items-center gap-2'>
                  <input
                    type='color'
                    aria-label='Pick the theme colour'
                    className='h-9 w-12 cursor-pointer rounded-md border bg-transparent p-1'
                    value={/^#[0-9a-fA-F]{6}$/.test(current.themeColor) ? current.themeColor : '#232626'}
                    onChange={e => set('themeColor', e.target.value.toUpperCase())}
                  />
                  <Input id='branding-themeColor' name='themeColor' className='w-32 font-mono' placeholder='#232626' value={current.themeColor} onChange={e => set('themeColor', e.target.value)} />
                  {current.themeColor && (
                    <Button type='button' variant='ghost' size='sm' onClick={() => set('themeColor', '')}>
                      Clear
                    </Button>
                  )}
                </div>
                <FieldDescription>Optional: the mobile browser bar&apos;s colour. Empty keeps the UI&apos;s own.</FieldDescription>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sharing (Open Graph)</CardTitle>
              <CardDescription>What a link to the site shows in chats and social posts. Empty fields fall back to the title and description.</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
              <TextField name='ogTitle' value={current.ogTitle} onChange={v => set('ogTitle', v)} placeholder={current.title || 'Page title'} />
              <TextField name='ogDescription' value={current.ogDescription} onChange={v => set('ogDescription', v)} multiline placeholder={current.description} />
              <ImageSlot slot='ogImage' value={current.ogImage} onChange={a => set('ogImage', a)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>The tab and a search result, as saved here.</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
              <div className='bg-muted flex w-fit max-w-full items-center gap-2 rounded-t-lg px-3 py-2 text-sm'>
                {current.mark ? (
                   
                  <img src={assetUrl(current.mark)!} alt='' className='size-4' />
                ) : (
                  <span className='bg-muted-foreground/30 size-4 rounded-sm' />
                )}
                <span className='truncate'>{pageTitle || 'bc-games'}</span>
              </div>
              <div className='rounded-lg border p-3'>
                <div className='text-muted-foreground text-xs'>{current.siteName || 'site'} › casino</div>
                <div className='truncate text-base font-medium text-blue-600 dark:text-blue-400'>{sample || 'Casino'}</div>
                <p className='text-muted-foreground line-clamp-2 text-sm'>{current.description || 'No description: search engines pick their own snippet.'}</p>
              </div>
              {current.keywords.length > 0 && (
                <div className='flex flex-wrap gap-1'>
                  {current.keywords.map(k => (
                    <Badge key={k} variant='secondary'>
                      {k}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {changes.length > 0 && (
        <div className='bg-background/95 fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur'>
          <div className='mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-3'>
            <span className={cn('text-sm', problem && 'text-destructive')}>
              {problem ?? `${changes.length} unsaved change${changes.length === 1 ? '' : 's'}`}
            </span>
            <div className='flex gap-2'>
              <Button variant='outline' onClick={discard}>
                Discard
              </Button>
              <Button disabled={!!problem} onClick={() => setReviewing(true)}>
                Review and save
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={reviewing} onOpenChange={setReviewing}>
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Save branding</DialogTitle>
            <DialogDescription>
              Version {doc?.version} → {(doc?.version ?? 0) + 1}. The site picks this up within seconds.
            </DialogDescription>
          </DialogHeader>
          <div className='max-h-[60vh] overflow-y-auto'>
            <ChangeList changes={changes} labelOf={c => c.key} />
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

export default Branding
