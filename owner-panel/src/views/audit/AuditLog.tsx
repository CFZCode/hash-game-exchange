'use client'

import ErrorState from '@/components/shared/ErrorState'
import DateTime from '@/components/shared/DateTime'
import PageHeader from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { featureLabel, flagLabel } from '@/configs/entitlementCatalogue'
import { useApi } from '@/hooks/use-api'
import type { AuditEntry } from '@/lib/entitlements/types'
import ChangeList from '@/views/entitlements/ChangeList'

const AuditLog = () => {
  const { data, error, isLoading } = useApi<AuditEntry[]>('/api/owner/audit')

  return (
    <>
      <PageHeader title='Audit log' description='Every entitlement save, newest first. Stored in owner-panel/data/audit.jsonl only.' />
      {error ? (
        <ErrorState error={error} />
      ) : (
        <Card className='py-0 shadow-none'>
          <CardContent className='px-0'>
            {isLoading ? (
              <Skeleton className='m-4 h-40' />
            ) : !data?.length ? (
              <p className='text-muted-foreground p-6 text-sm'>No saves yet. The site runs on the defaults: everything entitled.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='pl-4'>When</TableHead>
                    <TableHead>Who</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map(row => (
                    <TableRow key={`${row.version}-${row.at}`} className='align-top'>
                      <TableCell className='pl-4'>
                        <DateTime value={row.at} />
                      </TableCell>
                      <TableCell>{row.user}</TableCell>
                      <TableCell>
                        <Badge variant='outline' className='font-mono'>
                          v{row.version}
                        </Badge>
                      </TableCell>
                      <TableCell className='whitespace-normal'>
                        <ChangeList changes={row.changes} labelOf={c => (c.kind === 'feature' ? featureLabel(c.key) : flagLabel(c.key))} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}

export default AuditLog
