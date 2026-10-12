'use client'

import { LockIcon } from 'lucide-react'

import ErrorState from '@/components/shared/ErrorState'
import PageHeader from '@/components/shared/PageHeader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/hooks/use-api'
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
 * Site config → Branding: the site's name, page metadata and logo, read-only. The platform sets
 * them (owner panel); staff see what players get.
 */
const Branding = () => {
  const q = useApi<SiteBranding>('admin/branding', undefined, { refetchInterval: 15_000 })
  const b = q.data

  return (
    <div>
      <PageHeader title='Branding' description="The site's name, page title and meta tags, and its logo, as players get them." />
      <Alert className='mb-4'>
        <LockIcon />
        <AlertDescription>Managed by the platform. Ask the platform to change the name, the metadata or the logo.</AlertDescription>
      </Alert>
      {q.error && <ErrorState error={q.error} />}
      {q.isLoading || !b ? (
        <Skeleton className='h-64 w-full max-w-3xl' />
      ) : (
        <div className='grid max-w-5xl gap-4 lg:grid-cols-2'>
          <Card className='shadow-none'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'>
                Name and metadata {b.branded ? <Badge variant='secondary'>Set by the platform</Badge> : <Badge variant='outline'>Not branded</Badge>}
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
            <CardContent className='flex flex-wrap gap-4'>
              <Picture label='Logo' url={src(b.logoUrl)} className='h-8 w-36 object-contain' />
              <Picture label='Logo (light)' url={src(b.logoUrl)} className='h-8 w-36 object-contain' dark={false} />
              <Picture label='Square mark / favicon' url={src(b.markUrl)} className='size-10 object-contain' />
              <Picture label='Open Graph image' url={src(b.ogImageUrl)} className='max-h-14 max-w-28 object-contain' />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default Branding
