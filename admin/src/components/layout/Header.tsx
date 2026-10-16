'use client'

// React Imports
import { Fragment } from 'react'

// Next Imports
import { usePathname } from 'next/navigation'

// Component Imports
import ModeToggle from '@/components/layout/ModeToggle'
import ProfileDropdown from '@/components/shared/ProfileDropdown'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

/**
 * Breadcrumbs title-case each URL segment; these segments would read wrong
 * that way ("Pnl"), so they are spelled out.
 */
const SEGMENT_LABELS: Record<string, string> = {
  pnl: 'Profit & loss'
}

const segmentLabel = (segment: string) => {
  const raw = decodeURIComponent(segment)

  return SEGMENT_LABELS[raw.toLowerCase()] ?? raw.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const Header = () => {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  return (
    <header className='bg-background/80 border-border sticky top-0 z-50 border-b backdrop-blur-md'>
      <div className='mx-auto flex h-14 max-w-360 items-center justify-between gap-6 px-4 sm:px-6'>
        <div className='flex min-w-0 items-center gap-3'>
          <SidebarTrigger className='text-muted-foreground hover:text-foreground size-8 [&_svg]:size-4.5!' />
          <Separator orientation='vertical' className='bg-border hidden h-4! data-vertical:self-center sm:block' />
          <Breadcrumb className='hidden min-w-0 sm:block'>
            <BreadcrumbList>
              {segments.map((segment, index) => {
                const isLast = index === segments.length - 1

                const label = segmentLabel(segment)

                const href = '/' + segments.slice(0, index + 1).join('/')

                return (
                  <Fragment key={href}>
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage className='text-foreground font-medium'>{label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink className='text-muted-foreground'>{label}</BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator />}
                  </Fragment>
                )
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className='flex items-center gap-2'>
          <ModeToggle />
          <ProfileDropdown />
        </div>
      </div>
    </header>
  )
}

export default Header
