import MarketCard from './MarketCard';
import RunnerRow from './RunnerRow';
import { statusLabel } from './utils';

/**
 * OddEvenBlock — Odd | Even markets (both columns are BACK prices).
 *
 * @param {object}   props
 * @param {string}   [props.title='Odd / Even']
 * @param {Array<{id, name, odd:{price,size}, even:{price,size}, status?, pnl?, projected?}>} props.rows
 * @param {string}   [props.status]                     Block-wide status (overrides rows).
 * @param {{rowId, pick:'odd'|'even'}|null} [props.selected]
 * @param {(sel:{rowId, rowName, pick:'odd'|'even', side:'back', price, size})=>void} [props.onSelect]
 * @param {string|number|null} [props.activeRowId]
 * @param {React.ReactNode} [props.betSlip]
 * @param {number}   [props.min] @param {number} [props.max]
 * @param {boolean}  [props.collapsed] @param {(b)=>void} [props.onToggleCollapse]
 * @param {boolean}  [props.disabled]
 * @param {(n)=>string} [props.formatSize] @param {(n)=>string} [props.formatPrice] @param {(n)=>string} [props.formatAmount]
 */
export default function OddEvenBlock({
  title = 'Odd / Even',
  rows = [],
  status,
  selected = null,
  onSelect,
  activeRowId = null,
  betSlip = null,
  min,
  max,
  collapsed,
  onToggleCollapse,
  disabled = false,
  formatSize,
  formatPrice,
  formatAmount,
}) {
  const blockLabel = statusLabel(status);

  return (
    <MarketCard
      name={title}
      min={min}
      max={max}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      columns={['Odd', 'Even']}
      columnTones={['back', 'back']}
      formatAmount={formatAmount}
    >
      {rows.map((row) => (
        <RunnerRow
          key={row.id}
          name={row.name}
          status={blockLabel ?? row.status}
          disabled={disabled}
          pnl={row.pnl ?? null}
          projected={row.projected ?? null}
          cells={[
            { key: 'odd', side: 'back', price: row.odd?.price, size: row.odd?.size },
            { key: 'even', side: 'back', price: row.even?.price, size: row.even?.size },
          ]}
          selected={selected && selected.rowId === row.id ? { key: selected.pick } : null}
          onSelect={
            onSelect
              ? ({ key, price, size }) =>
                  onSelect({ rowId: row.id, rowName: row.name, pick: key, side: 'back', price, size })
              : undefined
          }
          formatSize={formatSize}
          formatPrice={formatPrice}
          formatAmount={formatAmount}
        >
          {activeRowId != null && activeRowId === row.id ? betSlip : null}
        </RunnerRow>
      ))}
    </MarketCard>
  );
}
