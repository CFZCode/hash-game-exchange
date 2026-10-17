/**
 * Cashier limits per currency — the document's `cashierLimits` block (Features & plan → Cashier).
 *
 *   { INR: { depositMin: '100', depositMax: '100000', withdrawMin: '500', withdrawMax: '50000' } }
 *
 * Each amount is in that currency, a decimal string above 0, or null = no owner limit (the
 * rail's own minimum still applies). The site admin shows them read-only. Mirrors
 * backend/packages/common/src/cashierLimits.js. No '@/' imports: tests load it as is.
 */

export const CASHIER_FIELDS = ['depositMin', 'depositMax', 'withdrawMin', 'withdrawMax'] as const

export type CashierField = (typeof CASHIER_FIELDS)[number]
export type CashierLimit = Record<CashierField, string | null>
export type CashierLimits = Record<string, CashierLimit>

const CODE = /^[A-Z0-9]{2,12}$/
const AMOUNT = /^\d{1,15}(\.\d{1,8})?$/

export const EMPTY_LIMIT: CashierLimit = { depositMin: null, depositMax: null, withdrawMin: null, withdrawMax: null }

/** A positive decimal string, or null. */
export const amountOf = (v: unknown): string | null => {
  const s = typeof v === 'number' && Number.isFinite(v) ? String(v) : typeof v === 'string' ? v.trim() : null

  return s && AMOUNT.test(s) && Number(s) > 0 ? s : null
}

/** Reading: known currencies and fields only; a bad value reads as no limit; empty rows dropped. */
export function cleanCashierLimits(value: unknown): CashierLimits {
  const given = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, unknown>
  const out: CashierLimits = {}

  for (const [raw, entry] of Object.entries(given)) {
    const code = raw.trim().toUpperCase()

    if (!CODE.test(code) || !entry || typeof entry !== 'object') continue
    const row = { ...EMPTY_LIMIT }

    for (const f of CASHIER_FIELDS) row[f] = amountOf((entry as Record<string, unknown>)[f])
    if (CASHIER_FIELDS.some(f => row[f] !== null)) out[code] = row
  }

  return out
}

/** Saving (strict): the first problem with a submitted block, or null. */
export function cashierLimitsProblem(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'cashierLimits must be an object'

  for (const [code, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!CODE.test(code)) return `cashierLimits: "${code}" is not a currency code`
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return `cashierLimits.${code} must be an object`
    const e = entry as Record<string, unknown>
    const extra = Object.keys(e).find(k => !(CASHIER_FIELDS as readonly string[]).includes(k))

    if (extra) return `cashierLimits.${code}.${extra} is not a field (${CASHIER_FIELDS.join(', ')})`

    for (const f of CASHIER_FIELDS) {
      if (e[f] != null && amountOf(e[f]) === null) return `cashierLimits.${code}.${f} must be an amount above 0 with at most 8 decimals, or empty`
    }

    for (const [lo, hi] of [
      ['depositMin', 'depositMax'],
      ['withdrawMin', 'withdrawMax']
    ] as const) {
      const a = amountOf(e[lo])
      const b = amountOf(e[hi])

      if (a && b && Number(a) > Number(b)) return `cashierLimits.${code}: ${lo} is above ${hi}`
    }
  }

  return null
}

/** "100 – 1,00,000 in · ≤ 50,000 out" style summary for the change list; "No limits" when empty. */
export function cashierLimitLabel(l: CashierLimit | undefined) {
  if (!l || CASHIER_FIELDS.every(f => l[f] === null)) return 'No limits'
  const side = (min: string | null, max: string | null) => (min && max ? `${min}–${max}` : min ? `≥ ${min}` : max ? `≤ ${max}` : 'any')

  return `deposit ${side(l.depositMin, l.depositMax)} · withdraw ${side(l.withdrawMin, l.withdrawMax)}`
}

/** One audit change per currency whose limits changed, compared cleaned. */
export function diffCashierLimits(before: unknown, after: unknown) {
  const from = cleanCashierLimits(before)
  const to = cleanCashierLimits(after)
  const codes = [...new Set([...Object.keys(from), ...Object.keys(to)])].sort()

  return codes
    .filter(code => JSON.stringify(from[code] ?? EMPTY_LIMIT) !== JSON.stringify(to[code] ?? EMPTY_LIMIT))
    .map(code => ({ kind: 'cashier_limits' as const, key: code, from: from[code] ?? { ...EMPTY_LIMIT }, to: to[code] ?? { ...EMPTY_LIMIT } }))
}
