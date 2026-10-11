'use client'

import { useEffect, useState } from 'react'

import { BellRingIcon, SaveIcon } from 'lucide-react'

import Can from '@/components/shared/Can'
import ErrorState from '@/components/shared/ErrorState'
import { SelectField, SwitchField, TextAreaField, TextField } from '@/components/shared/FormField'
import PageHeader from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useApi, useApiMutation } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { ImageInput, PushStatusCard } from './PushParts'
import type { PromptSettings, PushSettings as Settings } from './types'

/** Roughly what the player site's soft-ask sheet looks like (it draws it in the site's own theme). */
const PromptPreview = ({ p }: { p: PromptSettings }) => (
  <div className='bg-muted/40 grid place-items-center rounded-lg border border-dashed p-6'>
    <div className='bg-card text-card-foreground w-full max-w-sm rounded-xl border p-5 shadow-lg'>
      <div className='bg-primary/10 text-primary mb-3 flex size-10 items-center justify-center rounded-full'>
        <BellRingIcon className='size-5' />
      </div>
      <div className='font-semibold'>{p.title || 'Title'}</div>
      <p className='text-muted-foreground mt-1 text-sm'>{p.text || 'Text'}</p>
      <div className='mt-4 flex justify-end gap-2'>
        <Button variant='ghost' size='sm' tabIndex={-1}>
          {p.laterLabel || 'Not now'}
        </Button>
        <Button size='sm' tabIndex={-1}>
          {p.allowLabel || 'Allow'}
        </Button>
      </div>
    </div>
    <p className='text-muted-foreground mt-3 text-center text-xs'>
      {p.enabled
        ? p.trigger === 'after_login'
          ? `Shown ${p.delaySeconds}s after a signed-in visit`
          : 'Shown once the player has made a deposit'
        : 'Popup off — players can still turn push on in Settings'}
      {p.enabled ? `; after “${p.laterLabel}”, again in ${p.cooldownDays} day(s). Never shown once allowed or blocked.` : ''}
    </p>
  </div>
)

const PushSettings = () => {
  const { data, isLoading, error } = useApi<Settings>('admin/push/settings')
  const [s, setS] = useState<Settings | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (data) setS(data)
  }, [data])

  const save = useApiMutation({
    fn: () =>
      api.put<Settings>('admin/push/settings', {
        prompt: { ...s!.prompt, title: s!.prompt.title.trim(), text: s!.prompt.text.trim() },
        publicOrigin: s!.publicOrigin.trim().replace(/\/+$/, ''),
        allSegment: s!.allSegment.trim(),
        defaultIconUrl: s!.defaultIconUrl.trim()
      }),
    success: 'Push settings saved',
    invalidate: [['api', 'admin/push/settings'], ['api', 'admin/push/status']]
  })

  const setPrompt = <K extends keyof PromptSettings>(key: K, value: PromptSettings[K]) => setS(x => (x ? { ...x, prompt: { ...x.prompt, [key]: value } } : x))

  return (
    <div>
      <PageHeader title='Prompt & settings' description='The “allow notifications” popup players see on the site, and where push images and links point.' />
      <PushStatusCard />
      {isLoading && <Card className='h-64 animate-pulse shadow-none' />}
      {error && <ErrorState error={error} />}
      {s && (
        <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]'>
          <div className='grid content-start gap-6'>
            <Card className='shadow-none'>
              <CardHeader>
                <CardTitle className='text-base'>Permission popup (soft-ask)</CardTitle>
                <CardDescription>
                  Shown in the site’s theme before the browser’s own permission dialog, so a “no” here costs nothing — the browser asks only after “{s.prompt.allowLabel}”.
                </CardDescription>
              </CardHeader>
              <CardContent className='grid gap-4'>
                <SwitchField id='ps-on' label='Show the popup' checked={s.prompt.enabled} onChange={v => setPrompt('enabled', v)} />
                <TextField id='ps-title' label='Title' maxLength={80} value={s.prompt.title} onChange={e => setPrompt('title', e.target.value)} />
                <TextAreaField id='ps-text' label='Text' rows={3} maxLength={300} value={s.prompt.text} onChange={e => setPrompt('text', e.target.value)} />
                <div className='grid gap-4 sm:grid-cols-2'>
                  <TextField id='ps-allow' label='Allow button' maxLength={24} value={s.prompt.allowLabel} onChange={e => setPrompt('allowLabel', e.target.value)} />
                  <TextField id='ps-later' label='Dismiss button' maxLength={24} value={s.prompt.laterLabel} onChange={e => setPrompt('laterLabel', e.target.value)} />
                  <SelectField
                    id='ps-trigger'
                    label='When to show'
                    value={s.prompt.trigger}
                    onChange={v => setPrompt('trigger', v as PromptSettings['trigger'])}
                    options={[
                      { value: 'after_login', label: 'After sign-in + delay' },
                      { value: 'after_first_deposit', label: 'After the first deposit' }
                    ]}
                  />
                  <TextField
                    id='ps-delay'
                    label='Delay (seconds)'
                    inputMode='numeric'
                    value={String(s.prompt.delaySeconds)}
                    onChange={e => setPrompt('delaySeconds', Math.min(3600, Number(e.target.value.replace(/\D/g, '') || 0)))}
                  />
                  <TextField
                    id='ps-cool'
                    label='After “dismiss”, ask again in (days)'
                    inputMode='numeric'
                    value={String(s.prompt.cooldownDays)}
                    onChange={e => setPrompt('cooldownDays', Math.max(1, Math.min(365, Number(e.target.value.replace(/\D/g, '') || 1))))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className='shadow-none'>
              <CardHeader>
                <CardTitle className='text-base'>Delivery settings</CardTitle>
              </CardHeader>
              <CardContent className='grid gap-4'>
                <TextField
                  id='ps-origin'
                  label='Public origin'
                  placeholder='https://www.your-site.com'
                  value={s.publicOrigin}
                  onChange={e => setS({ ...s, publicOrigin: e.target.value })}
                  hint='The player site’s public https address. Uploaded images are served from it (OneSignal fetches them) and site paths like /vip become links on it. Empty = the backend’s PUBLIC_ASSET_ORIGIN / PUBLIC_SITE_URL. A localhost origin works for testing, but notifications then arrive without the image.'
                />
                <TextField
                  id='ps-seg'
                  label='“Everyone” segment in OneSignal'
                  value={s.allSegment}
                  onChange={e => setS({ ...s, allSegment: e.target.value })}
                  hint='“Total Subscriptions” on apps created since 2024; older apps call it “Subscribed Users”.'
                />
                <ImageInput
                  id='ps-icon'
                  label='Default notification icon'
                  value={s.defaultIconUrl}
                  onChange={v => setS({ ...s, defaultIconUrl: v })}
                  hint='Square PNG, 256×256 recommended, https. Empty = the default icon set in the OneSignal dashboard.'
                />
              </CardContent>
            </Card>

            <Can permission='config:write'>
              <Button
                className='justify-self-start'
                disabled={save.isPending || !s.prompt.title.trim() || !s.prompt.text.trim() || !s.prompt.allowLabel.trim() || !s.prompt.laterLabel.trim() || !s.allSegment.trim()}
                onClick={() => save.mutate()}
              >
                <SaveIcon /> Save settings
              </Button>
            </Can>
          </div>
          <div className='xl:sticky xl:top-4'>
            <PromptPreview p={s.prompt} />
          </div>
        </div>
      )}
    </div>
  )
}

export default PushSettings
