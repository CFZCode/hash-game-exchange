'use client'

// Third-party Imports
import { CircleCheckIcon, ShieldAlertIcon } from 'lucide-react'

// Component Imports
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/views/finance/shared'

/**
 * The transaction password a first sign-in is issued (TENEXCH flow). The password change ends the
 * session, so ChangePassword leaves the code here and the login screen shows it once.
 */
const ISSUED_TXN_KEY = 'issued-transaction-password'

export const keepIssuedTransactionPassword = (code: string) => {
  try {
    sessionStorage.setItem(ISSUED_TXN_KEY, code)
  } catch {
    // Storage blocked: the code is lost, the staff sets a new one under My account.
  }
}

/** Reads and removes it — never kept past the one screen that shows it. */
export const takeIssuedTransactionPassword = (): string | null => {
  try {
    const code = sessionStorage.getItem(ISSUED_TXN_KEY)

    sessionStorage.removeItem(ISSUED_TXN_KEY)

    return code
  } catch {
    return null
  }
}

const IssuedTransactionPassword = ({ code, onContinue }: { code: string; onContinue: () => void }) => (
  <div className='grid gap-6 text-center'>
    <div className='grid justify-items-center gap-2'>
      <span className='bg-success/10 text-success grid size-14 place-items-center rounded-full'>
        <CircleCheckIcon className='size-7' />
      </span>
      <p className='text-heading text-lg font-medium'>Your password has been updated</p>
      <p className='text-muted-foreground'>आपका पासवर्ड बदला जा चुका है।</p>
    </div>

    <div className='grid gap-2'>
      <span className='text-muted-foreground text-sm'>Your transaction password · आपका लेनदेन पासवर्ड</span>
      <div className='bg-muted/40 flex items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-4'>
        <span className='text-heading font-mono text-3xl font-semibold tracking-[0.3em] tabular-nums'>{code}</span>
        <CopyButton value={code} label='Copy transaction password' />
      </div>
    </div>

    <Alert>
      <ShieldAlertIcon />
      <AlertDescription className='grid gap-2'>
        <p>
          Remember it: from now on every transaction on the panel needs this password. Do not share it with anyone. It
          is shown only this once; you can change it later under My account.
        </p>
        <p>
          इसे याद रखें: अब से पैनल के सभी लेन-देन केवल इसी पासवर्ड से होंगे। इसे किसी के साथ साझा न करें। यह सिर्फ एक
          बार दिखेगा।
        </p>
      </AlertDescription>
    </Alert>

    <Button className='h-11 w-auto justify-self-center px-6 uppercase' onClick={onContinue}>
      Continue to sign in
    </Button>
  </div>
)

export default IssuedTransactionPassword
