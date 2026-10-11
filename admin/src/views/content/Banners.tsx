'use client'

import { useEffect, useMemo, useState } from 'react'

import { ImageIcon, UploadIcon } from 'lucide-react'

import Can from '@/components/shared/Can'
import DataTable, { type Column } from '@/components/shared/DataTable'
import DateTime from '@/components/shared/DateTime'
import FormDialog from '@/components/shared/FormDialog'
import { SelectField, TextField } from '@/components/shared/FormField'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useApi, useApiMutation } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import type { Banner } from './types'

/**
 * Banners are addressed by PLACEMENT, not by id: uploading `hero-1` again
 * replaces that slide. The image bytes live in the database and are served
 * from `admin/banners/image/:filename`, so a preview is an `<img>` at the
 * proxy URL rather than a blob fetch.
 */
const bannerImageUrl = (b: Banner) => api.url(`admin/banners/${b.type}`).replace(/\/banners\/.*$/, `/banners/image/${encodeURIComponent(b.type)}`)

/**
 * Where a placement shows on the site, and the image that suits it. Picking one fills the
 * placement name; "Other" takes any name for a template that reads its own.
 */
const PLACEMENTS = [
  { value: 'home', label: 'Home · hero banner', hint: 'Right half of the home hero. A transparent PNG/WebP cut-out, about 1200×880.' },
  ...[1, 2, 3, 4, 5, 6].map(n => ({
    value: `slider-${n}`,
    label: `Promo slider · slide ${n}`,
    hint: 'With a title: copy on the left, the image as art on the right (transparent cut-out, about 700×700). Without a title: a finished banner covering the card, about 900×420.'
  })),
  { value: 'casino', label: 'Casino · wide promo banner', hint: 'A finished banner across the casino lobby, about 1280×260.' }
] as const

const OTHER = '__other__'

const blankForm = (b?: Banner) => ({
  type: b?.type ?? '',
  title: b?.title ?? '',
  subtitle: b?.subtitle ?? '',
  ctaLabel: b?.cta?.label ?? '',
  ctaHref: b?.cta?.href ?? '',
  sortOrder: String(b?.sortOrder ?? 0)
})

const UploadBanner = ({ existing }: { existing?: Banner }) => {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(() => blankForm(existing))
  const [file, setFile] = useState<File | null>(null)
  const preset = PLACEMENTS.find(p => p.value === form.type)
  const [other, setOther] = useState(() => !!existing && !preset)

  // The chosen file's preview lives only while it is chosen.
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  // Every open starts from the banner as it is now (or blank), never from the last upload.
  const onOpenChange = (next: boolean) => {
    if (next) {
      setForm(blankForm(existing))
      setFile(null)
      setOther(!!existing && !PLACEMENTS.some(p => p.value === existing.type))
    }

    setOpen(next)
  }

  const upload = useApiMutation({
    fn: () => {
      const fd = new FormData()

      fd.set('type', form.type)
      for (const k of ['title', 'subtitle', 'ctaLabel', 'ctaHref'] as const) if (form[k]) fd.set(k, form[k])
      if (form.sortOrder !== '') fd.set('sortOrder', form.sortOrder)
      if (file) fd.set('image', file)

      return api.upload<Banner>('admin/banners', fd)
    },
    invalidate: [['api', 'admin/banners']],
    success: b => `Placement ${b?.type ?? form.type} saved`
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        existing ? (
          <Button variant='ghost' size='sm'>
            Edit
          </Button>
        ) : (
          <Button>
            <UploadIcon /> Upload banner
          </Button>
        )
      }
      title={existing ? `Edit ${existing.type}` : 'Upload a banner'}
      description='The placement is the address: saving the same one again replaces it. A call to action needs both its label and its link, or neither.'
      submitLabel={existing ? 'Save' : 'Upload'}
      onSubmit={() => upload.mutateAsync()}
    >
      {existing ? (
        <TextField id='b-type' label='Placement' readOnly value={form.type} hint={preset?.hint} />
      ) : (
        <>
          <SelectField
            id='b-place'
            label='Placement *'
            placeholder='Where it shows'
            value={other ? OTHER : form.type}
            onChange={v => {
              setOther(v === OTHER)
              setForm({ ...form, type: v === OTHER ? '' : v })
            }}
            options={[...PLACEMENTS.map(p => ({ value: p.value, label: p.label })), { value: OTHER, label: 'Other (type a name)' }]}
            hint={preset?.hint}
          />
          {other && (
            <TextField
              id='b-type'
              label='Placement name'
              required
              hint='Lowercase letters, digits, dash and underscore — e.g. hero-1, home_welcome'
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value.toLowerCase() })}
            />
          )}
        </>
      )}
      <div className='grid gap-2'>
        <label htmlFor='b-image' className='text-sm font-medium'>
          Image {existing ? '(leave empty to keep the current one)' : '*'}
        </label>
        <input id='b-image' type='file' accept='image/png,image/jpeg,image/webp' className='text-sm' onChange={e => setFile(e.target.files?.[0] ?? null)} required={!existing} />
        {(preview || existing) && (
           
          <img
            src={preview ?? bannerImageUrl(existing!)}
            alt={preview ? 'The new image' : 'The current image'}
            className='bg-muted max-h-40 w-full rounded border object-contain'
          />
        )}
      </div>
      <TextField id='b-title' label='Title' value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
      <TextField id='b-sub' label='Subtitle' value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} />
      <div className='grid grid-cols-2 gap-4'>
        <TextField id='b-cta' label='CTA label' value={form.ctaLabel} onChange={e => setForm({ ...form, ctaLabel: e.target.value })} />
        <TextField id='b-href' label='CTA link' hint='/casino or https://…' value={form.ctaHref} onChange={e => setForm({ ...form, ctaHref: e.target.value })} />
      </div>
      <TextField id='b-sort' label='Sort order' type='number' min={0} max={9999} value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value })} />
    </FormDialog>
  )
}

const Banners = () => {
  const [showInactive, setShowInactive] = useState(true)
  const list = useApi<Banner[]>('admin/banners', { includeInactive: showInactive }, { retry: false })

  const setActive = useApiMutation({
    fn: (v: { type: string; active: boolean }) => api.patch(`admin/banners/${v.type}/active`, { active: v.active }),
    invalidate: [['api', 'admin/banners']],
    success: (_r, v) => `${v.type} is now ${v.active ? 'visible' : 'hidden'}`
  })

  const columns: Column<Banner>[] = [
    {
      key: 'preview',
      header: 'Preview',
      cell: b => (
         
        <img src={bannerImageUrl(b)} alt={b.type} className='bg-muted h-10 w-24 rounded object-cover' onError={e => (e.currentTarget.style.visibility = 'hidden')} />
      )
    },
    { key: 'type', header: 'Placement', cell: b => <span className='font-mono text-xs'>{b.type}</span> },
    {
      key: 'copy',
      header: 'Copy',
      cell: b => (
        <span className='block max-w-80'>
          <span className='block truncate text-sm'>{b.title ?? <span className='text-muted-foreground'>no title</span>}</span>
          <span className='text-muted-foreground block truncate text-xs'>{b.subtitle ?? ''}</span>
        </span>
      )
    },
    { key: 'cta', header: 'CTA', cell: b => (b.cta ? <span className='text-xs'>{b.cta.label} → <code>{b.cta.href}</code></span> : <span className='text-muted-foreground'>—</span>) },
    { key: 'sort', header: 'Order', align: 'right', cell: b => <span className='tabular-nums'>{b.sortOrder}</span> },
    { key: 'active', header: 'Visible', cell: b => <Can permission='config:write' fallback={<StatusBadge value={b.active} />}><Switch checked={b.active} onCheckedChange={active => setActive.mutate({ type: b.type, active })} /></Can> },
    { key: 'at', header: 'Updated', cell: b => <DateTime value={b.updatedAt ?? b.createdAt} relative /> },
    { key: 'actions', header: '', align: 'right', cell: b => <Can permission='config:write'><UploadBanner existing={b} /></Can> }
  ]

  return (
    <div>
      <PageHeader
        title='Banners'
        description='Hero slides and promo artwork. A placement name is the address — re-uploading it replaces the image everywhere it is shown.'
        actions={
          <>
            <label className='flex items-center gap-2 text-sm'>
              <Switch checked={showInactive} onCheckedChange={setShowInactive} /> Show hidden
            </label>
            <Can permission='config:write'>
              <UploadBanner />
            </Can>
          </>
        }
      />
      <DataTable
        columns={columns}
        rows={list.data}
        rowKey={b => b.type}
        loading={list.isLoading}
        fetching={list.isFetching}
        error={list.error}
        emptyMessage={
          <span className='flex flex-col items-center gap-1'>
            <ImageIcon className='text-muted-foreground size-5' />
            No banner uploaded yet. The site falls back to its built-in artwork until one exists.
          </span>
        }
      />
    </div>
  )
}

export default Banners
