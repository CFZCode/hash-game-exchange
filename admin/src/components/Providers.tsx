'use client'

// React Imports
import { useState, type ReactNode } from 'react'

// Third-party Imports
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Component Imports
import { ThemeProvider } from './ThemeProvider'
import { SidebarProvider } from './ui/sidebar'
import { TooltipProvider } from './ui/tooltip'
import { SessionProvider } from '@/contexts/SessionContext'
import { ApiError } from '@/lib/api/client'

type Props = {
  children: ReactNode
  sidebarDefaultOpen?: boolean
}

const Providers = ({ children, sidebarDefaultOpen }: Props) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // A 4xx (403 forbidden, 404, 422) answers the same on a second try — retrying only doubled every refused request.
            retry: (failureCount, error) => failureCount < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
            refetchOnWindowFocus: false,
            staleTime: 10_000
          }
        }
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider attribute='class' defaultTheme='system' enableSystem={true}>
          <TooltipProvider>
            <SidebarProvider defaultOpen={sidebarDefaultOpen}>{children}</SidebarProvider>
          </TooltipProvider>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  )
}

export default Providers
