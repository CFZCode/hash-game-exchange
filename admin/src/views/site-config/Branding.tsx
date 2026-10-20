'use client'

import { useRef } from 'react'

import { LockIcon, RotateCcwIcon, UploadIcon } from 'lucide-react'

import ErrorState from '@/components/shared/ErrorState'
import PageHeader from '@/components/shared/PageHeader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLivePoll } from '@/lib/realtime-status'
import { useSession } from '@/contexts/SessionContext'
import { useApi, useApiMutation } from '@/hooks/use-api'
import { api } from '@/lib/api/client'

/** `GET /api/v1/admin/branding` — set in the owner panel only; there is no write route. */
type SiteBranding = {
  version: number
  branded: boolean
  siteName: string | null
  title: string | null
  titleTemplate: string | null
  description: string | null
  keywords: string[]
  ogTitle: string | null
  ogDescription: string | null
  themeColor: string | null
  logoUrl: string | null
  markUrl: string | null
  ogImageUrl: string | null
  managedBy: 'owner' | null
}

/** The backend answers `/api/v1/admin/branding/asset/<hash>.<ext>`; this admin reaches the gateway through its own proxy. */
const src = (path: string | null) => (path ? api.url(path.replace(/^\/api\/v1\//, '')) : null)

const Row = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div className='grid gap-1 py-2 sm:grid-cols-[12rem_1fr]'>
    <dt className='text-muted-foreground text-sm'>{label}</dt>
    <dd className='text-sm break-words'>{value || <span className='text-muted-foreground'>— the site&apos;s own</span>}</dd>
  </div>
)

const Picture = ({ label, url, className, dark = true }: { label: string; url: string | null; className: string; dark?: boolean }) => (
  <div className='flex flex-col gap-1.5'>
    <span className='text-muted-foreground text-xs'>{label}</span>
    <div className='flex h-16 min-w-24 items-center justify-center rounded-md border px-3' style={{ background: dark ? '#232626' : '#FFFFFF' }}>
      {url ? (
         
        <img src={url} alt={label} className={className} />
      ) : (
        <span className='text-muted-foreground text-xs'>the UI&apos;s own</span>
      )}
    </div>
  </div>
)

/**
 * The Super Admin's upload / reset for the logo or the icon (`PUT|DELETE admin/branding/:slot`).
 * The newer of the Super Admin's and the owner's image is what players get.
 */
const SiteImage = ({ slot }: { slot: 'logo' | 'mark' }) => {
  const input = useRef<HTMLInputElement>(null)
  const name = slot === 'logo' ? 'Logo' : 'Icon'
  const invalidate = [['api', 'admin/branding']]

  const upload = useApiMutation({
    fn: (file: File) => {
      const fd = new FormData()

      fd.set('image', file)

      return api.upload(`admin/branding/${slot}`, fd, 'PUT')
    },
    invalidate,
    success: `${name} updated on the site`
  })

  const reset = useApiMutation({ fn: () => api.delete(`admin/branding/${slot}`), invalidate, success: `${name} reset to the platform's` })

  return (
    <div className='flex gap-2'>
      <input
        ref={input}
        type='file'
        accept='image/png,image/webp,image/svg+xml'
        className='hidden'
        onChange={e => {
          const file = e.target.files?.[0]

          e.target.value = ''
          if (file) upload.mutate(file)
        }}
      />
      <Button size='sm' variant='outline' disabled={upload.isPending} onClick={() => input.current?.click()}>
        <UploadIcon /> Change {name.toLowerCase()}
      </Button>
      <Button size='sm' variant='ghost' disabled={reset.isPending} onClick={() => reset.mutate()} title="Back to the platform's image">
        <RotateCcwIcon /> Reset
      </Button>
    </div>
  )
}

/**
 * Site config → Branding: the site's name, page metadata and logo as players get them. The
 * platform sets them (owner panel); the Super Admin can also change the logo and the icon.
 */
const Branding = () => {
  const brandingPoll = useLivePoll(15_000)
  const q = useApi<SiteBranding>('admin/branding', undefined, { refetchInterval: brandingPoll })
  const b = q.data
  const { can, actor } = useSession()
  const canEdit = actor?.direct === true && can('config:write')

  return (
    <div>
      <PageHeader title='Branding' description="The site's name, page title and meta tags, and its logo, as players get them." />
      <Alert className='mb-4'>
        <LockIcon />
        <AlertDescription>The name and metadata are managed by the platform.{canEdit ? ' The logo and the icon can be changed here; the latest change, here or by the platform, is what players see.' : ''}</AlertDescription>
      </Alert>
      {q.error && <ErrorState error={q.error} />}
      {q.isLoading || !b ? (
        <Skeleton className='h-64 w-full max-w-3xl' />
      ) : (
        <div className='grid max-w-5xl gap-4 lg:grid-cols-2'>
          <Card className='shadow-none'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'>
                Name and metadata {b.branded ? <Badge variant='secondary'>Branded</Badge> : <Badge variant='outline'>Not branded</Badge>}
              </CardTitle>
              <CardDescription>Version {b.version}</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className='divide-y'>
                <Row label='Site name' value={b.siteName} />
                <Row label='Page title' value={b.title} />
                <Row label='Title template' value={b.titleTemplate} />
                <Row label='Meta description' value={b.description} />
                <Row label='Meta keywords' value={b.keywords.join(', ')} />
                <Row label='Open Graph title' value={b.ogTitle} />
                <Row label='Open Graph description' value={b.ogDescription} />
                <Row label='Theme colour' value={b.themeColor} />
              </dl>
            </CardContent>
          </Card>
          <Card className='shadow-none'>
            <CardHeader>
              <CardTitle className='text-base'>Logo and icons</CardTitle>
              <CardDescription>On the site&apos;s dark header colour and on white.</CardDescription>
            </CardHeader>
            <CardContent className='grid gap-4'>
              <div className='flex flex-wrap gap-4'>
                <Picture label='Logo' url={src(b.logoUrl)} className='h-8 w-36 object-contain' />
                <Picture label='Logo (light)' url={src(b.logoUrl)} className='h-8 w-36 object-contain' dark={false} />
              </div>
              {canEdit && <SiteImage slot='logo' />}
              <div className='flex flex-wrap gap-4'>
                <Picture label='Square mark / favicon' url={src(b.markUrl)} className='size-10 object-contain' />
                <Picture label='Open Graph image' url={src(b.ogImageUrl)} className='max-h-14 max-w-28 object-contain' />
              </div>
              {canEdit && <SiteImage slot='mark' />}
              {canEdit && <p className='text-muted-foreground text-xs'>PNG, WebP or SVG, up to 256 KB. Logo: wide, transparent (576×128 is sharp). Icon: square.</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default Branding
