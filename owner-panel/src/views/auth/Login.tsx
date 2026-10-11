'use client'

import { useState } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import { Loader2Icon } from 'lucide-react'

import Logo from '@/components/shared/Logo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Toaster } from '@/components/ui/sonner'
import { siteConfig } from '@/configs/site'
import { errorMessage, request } from '@/lib/api/client'
import AuthBackgroundShape from '@/assets/svg/auth-background-shape'

const Login = () => {
  const router = useRouter()
  const params = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)

    try {
      await request('/api/auth/login', { method: 'POST', body: { username, password } })
      router.replace(params.get('next') || '/overview')
      router.refresh()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='relative flex min-h-screen items-center justify-center overflow-x-hidden px-4 py-10'>
      <div className='absolute'>
        <AuthBackgroundShape />
      </div>
      <Card className='z-1 w-full gap-6 py-6 sm:max-w-sm'>
        <CardHeader className='gap-4 px-6'>
          <Logo className='gap-3' />
          <div>
            <CardTitle className='text-2xl font-semibold'>{siteConfig.name}</CardTitle>
            <CardDescription>Owner sign-in for {siteConfig.key} · {siteConfig.environment}. The login is OWNER_USERNAME / OWNER_PASSWORD in owner-panel/.env.local.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className='px-6'>
          <form onSubmit={submit}>
            <FieldGroup className='gap-4'>
              <Field className='gap-2'>
                <FieldLabel htmlFor='user'>Username</FieldLabel>
                <Input id='user' autoComplete='username' autoFocus value={username} onChange={e => setUsername(e.target.value)} required />
              </Field>
              <Field className='gap-2'>
                <FieldLabel htmlFor='pw'>Password</FieldLabel>
                <Input id='pw' type='password' autoComplete='current-password' value={password} onChange={e => setPassword(e.target.value)} required />
              </Field>
              {error && (
                <Alert variant='destructive'>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type='submit' disabled={busy}>
                {busy && <Loader2Icon className='animate-spin' />} Sign in
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  )
}

export default Login
