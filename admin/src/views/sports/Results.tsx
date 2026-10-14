'use client'

import Link from 'next/link'

import { InfoIcon } from 'lucide-react'

import PageHeader from '@/components/shared/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

/**
 * A results history (per market / fancy / per user) is not something this
 * sportsbook backend keeps an API for: the sports service (the mssports /
 * TENEXCH port) settles markets from its results worker and the manual
 * declare route, and exposes no `admin/sports/results/*` list. This page used
 * to call those routes and showed empty tables on the 404s; it now says so.
 * The nav item is hidden; the page stays for old links.
 */
const Results = () => (
  <div>
    <PageHeader title='Sports results' description='What each settled market paid.' />
    <Alert>
      <InfoIcon />
      <AlertTitle>Not available on this sportsbook backend</AlertTitle>
      <AlertDescription>
        <p>
          Results are settled automatically by the sports service&apos;s results worker (or declared by hand on the settlement screen); it keeps no results history that this
          page could list.
        </p>
        <p>
          For markets settled in the last 24 hours see{' '}
          <Link href='/sports/settlement' className='underline underline-offset-2'>
            Settlement → Settled
          </Link>
          ; for a player&apos;s settled bets see{' '}
          <Link href='/sports/bets' className='underline underline-offset-2'>
            Bets
          </Link>
          .
        </p>
      </AlertDescription>
    </Alert>
  </div>
)

export default Results
