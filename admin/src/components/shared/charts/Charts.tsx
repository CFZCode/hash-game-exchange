'use client'

import { useId, useMemo, useState, type ReactNode } from 'react'

import {
  Area,
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
  type TooltipContentProps,
  type YAxisTickContentProps
} from 'recharts'

import {
  ChartFrame,
  ChartLegend,
  isEmptySeries,
  textPx,
  TooltipBox,
  truncate,
  useBoxSize,
  type CommonChartProps,
  type TooltipRow
} from './ChartFrame'
import { bucketLabel, formatAxisValue, formatValue, type Granularity, type ValueFormat } from './format'
import { useChartTheme, type ChartColor, type ChartTheme } from './theme'

export type ChartSeries = {
  name: string
  data: (number | null)[]

  /** A token (`chart-1`…`chart-8`, `primary`, …). Default: the next categorical slot, by position. */
  color?: ChartColor

  /** Per-series mark in a mixed chart (bars + a line). Defaults to the chart's `kind`. */
  kind?: 'line' | 'area' | 'bar'
}

type Row = Record<string, string | number | null>

/** About how many px one x-axis label ("w/c 05 Oct") needs, gap included. */
const X_LABEL_PX = 64

/** How long a mark takes to draw in. */
const ANIMATION_MS = 300

// recharts' `barCategoryGap` is taken off BOTH sides of a band: 21% leaves the bars ~58% of it.

const valueFormatter = (format: ValueFormat, currency: string | null | undefined) => (v: number | null | undefined) =>
  formatValue(v, format, format === 'money' ? currency : undefined)

const axisTick = (theme: ChartTheme) => ({ fill: theme.color['muted-foreground'], fontSize: 11 })

/** Series i is stored under `s<i>`, so a series name can never clash with the row's own keys. */
const key = (i: number) => `s${i}`

/** The hover box for a cartesian chart: the row's label plus every series that has a value there. */
function seriesTooltip(series: ChartSeries[], colors: string[], fmt: (v: number | null | undefined) => string) {
  const TooltipContent = ({ active, payload, label }: TooltipContentProps) => {
    if (!active || !payload?.length) return null
    const byKey = new Map(payload.map(p => [String(p.dataKey), p.value]))

    const rows: TooltipRow[] = series.flatMap((s, i) => {
      const v = byKey.get(key(i))

      return v === null || v === undefined ? [] : [{ key: key(i), name: s.name, color: colors[i], value: Number(v) }]
    })

    return <TooltipBox label={label as ReactNode} rows={rows} format={fmt} />
  }

  return TooltipContent
}

/**
 * For stacked bars only the outer end of each stack is rounded (one end above zero, one below),
 * like a single bar. Marks which series ends the stack in each direction, per row.
 */
function markStackEnds(rows: Row[], count: number) {
  for (const row of rows) {
    let pos = -1
    let neg = -1

    for (let i = 0; i < count; i++) {
      const v = Number(row[key(i)])

      if (v > 0) pos = i
      else if (v < 0) neg = i
    }

    row.__pos = pos
    row.__neg = neg
  }
}

/** A bar shape that rounds its far end only when it is the outermost segment of its stack. */
const stackedBarShape = (index: number, horizontal: boolean) => {
  const StackedBar = (p: BarShapeProps) => {
    const row = (p.payload ?? {}) as Row
    const v = Number(row[key(index)])
    const outer = v > 0 ? row.__pos === index : v < 0 ? row.__neg === index : false
    const radius: [number, number, number, number] = horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]

    return <Rectangle {...p} radius={outer ? radius : 0} />
  }

  return StackedBar
}

/** Line/area/bar over time buckets. One y-axis, always — two measures of different scale are two charts. */
export type TimeSeriesChartProps = CommonChartProps & {

  /** Bucket keys ('yyyy-MM-dd', the bucket's first day) — see `bucketKeys()`. */
  buckets: string[]
  granularity?: Granularity
  series: ChartSeries[]
  kind?: 'line' | 'area' | 'bar'
  stacked?: boolean
}

export const TimeSeriesChart = ({
  buckets,
  granularity = 'day',
  series,
  kind = 'area',
  stacked,
  height = 280,
  format = 'number',
  currency,
  ...frame
}: TimeSeriesChartProps) => {
  const theme = useChartTheme()
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [boxRef, { width }] = useBoxSize()

  // Show only as many bucket labels as the width holds; the rest stay in the tooltip.
  const labelPx = granularity === 'week' ? X_LABEL_PX + 16 : X_LABEL_PX
  const fit = width ? Math.max(2, Math.floor((width - 48) / labelPx)) : 8
  const interval = buckets.length > fit ? Math.ceil(buckets.length / fit) - 1 : 0

  const colors = useMemo(() => series.map((s, i) => theme.resolve(s.color, i)), [series, theme])
  const kinds = series.map(s => s.kind ?? kind)
  const hasBar = kinds.includes('bar')
  const fmt = valueFormatter(format, currency)

  const data = useMemo(() => {
    const rows: Row[] = buckets.map((b, i) => {
      const row: Row = { label: bucketLabel(b, granularity) }

      series.forEach((s, j) => (row[key(j)] = s.data[i] ?? null))

      return row
    })

    if (stacked) markStackEnds(rows, series.length)

    return rows
  }, [buckets, granularity, series, stacked])

  const single = buckets.length === 1
  const activeDot = (color: string) => ({ r: 5, fill: color, stroke: theme.color.card, strokeWidth: 2 })

  return (
    <ChartFrame {...frame} height={height} empty={buckets.length === 0 || isEmptySeries(series)}>
      <div className='flex size-full flex-col gap-2'>
        {series.length > 1 && <ChartLegend items={series.map((s, i) => ({ name: s.name, color: colors[i] }))} />}
        <div ref={boxRef} className='min-h-0 flex-1'>
          <ResponsiveContainer width='100%' height='100%' initialDimension={{ width: 320, height }}>
            <ComposedChart
              data={data}
              margin={{ top: 6, right: 8, bottom: 0, left: 0 }}
              stackOffset={stacked ? 'sign' : 'none'}
              barCategoryGap={buckets.length > 40 ? '10%' : '21%'}
              barGap={2}
              accessibilityLayer={false}
              style={{ fontFamily: theme.fontFamily }}
            >
              <defs>
                {series.map((_, i) =>
                  kinds[i] === 'area' ? (
                    <linearGradient key={i} id={`${uid}-g${i}`} x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='0%' stopColor={colors[i]} stopOpacity={0.28} />
                      <stop offset='95%' stopColor={colors[i]} stopOpacity={0.02} />
                    </linearGradient>
                  ) : null
                )}
              </defs>
              <CartesianGrid vertical={false} stroke={theme.color.border} strokeDasharray='3 3' />
              <XAxis dataKey='label' axisLine={false} tickLine={false} interval={interval} tick={axisTick(theme)} tickMargin={8} />
              <YAxis width='auto' axisLine={false} tickLine={false} tick={axisTick(theme)} tickFormatter={(v: number) => formatAxisValue(v, format)} />
              <Tooltip
                content={seriesTooltip(series, colors, fmt)}
                cursor={hasBar ? { fill: theme.color.muted, fillOpacity: 0.6 } : { stroke: theme.color.border, strokeWidth: 1 }}
                isAnimationActive={false}
                wrapperStyle={{ zIndex: 20, outline: 'none' }}
              />
              {series.map((s, i) => {
                const k = kinds[i]
                const common = { dataKey: key(i), name: s.name, isAnimationActive: true, animationDuration: ANIMATION_MS }

                if (k === 'bar')
                  return (
                    <Bar
                      key={i}
                      {...common}
                      fill={colors[i]}
                      fillOpacity={0.95}
                      maxBarSize={56}
                      stackId={stacked ? 'stack' : undefined}
                      radius={stacked ? undefined : [4, 4, 0, 0]}
                      shape={stacked ? stackedBarShape(i, false) : undefined}
                    />
                  )

                if (k === 'area')
                  return (
                    <Area
                      key={i}
                      {...common}
                      type='monotone'
                      stroke={colors[i]}
                      strokeWidth={2}
                      fill={`url(#${uid}-g${i})`}
                      fillOpacity={1}
                      stackId={stacked ? 'area' : undefined}
                      dot={single ? { r: 4, fill: colors[i], strokeWidth: 0 } : false}
                      activeDot={activeDot(colors[i])}
                    />
                  )

                return (
                  <Line
                    key={i}
                    {...common}
                    type='monotone'
                    stroke={colors[i]}
                    strokeWidth={2}
                    strokeLinecap='round'
                    dot={single ? { r: 4, fill: colors[i], strokeWidth: 0 } : false}
                    activeDot={activeDot(colors[i])}
                  />
                )
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartFrame>
  )
}

/** Bars over named categories (top games, sports, currencies). Horizontal reads best for long names. */
export type BarChartProps = CommonChartProps & {
  categories: string[]
  series: ChartSeries[]
  horizontal?: boolean
  stacked?: boolean
}

/** Widest name column on a horizontal bar chart, and the longest name a tilted label shows. */
const NAME_COL_PX = 160
const TILT_MAX_CHARS = 22

export const BarChart = ({ categories, series, horizontal, stacked, height = 280, format = 'number', currency, ...frame }: BarChartProps) => {
  const theme = useChartTheme()
  const [boxRef, { width }] = useBoxSize()
  const colors = useMemo(() => series.map((s, i) => theme.resolve(s.color, i)), [series, theme])
  const fmt = valueFormatter(format, currency)
  const longest = categories.reduce((m, c) => Math.max(m, c.length), 0)

  const data = useMemo(() => {
    const rows: Row[] = categories.map((c, i) => {
      const row: Row = { label: c }

      series.forEach((s, j) => (row[key(j)] = s.data[i] ?? null))

      return row
    })

    if (stacked) markStackEnds(rows, series.length)

    return rows
  }, [categories, series, stacked])

  // Horizontal: the names sit in a column up to 160px wide, cut with an ellipsis past that.
  const nameCol = Math.min(NAME_COL_PX, textPx(longest, 12) + 10)
  const nameChars = Math.max(4, Math.floor((NAME_COL_PX - 14) / (12 * 0.6)))

  // Vertical: every bar is a named thing, so no name is dropped. When the names collide they are
  // tilted (and a very long one cut; the full name stays in the tooltip and the table).
  const band = width ? (width - 56) / Math.max(1, categories.length) : Infinity
  const tilt = !horizontal && textPx(longest) > band - 6
  const tiltChars = Math.min(longest, TILT_MAX_CHARS)
  const tiltHeight = Math.min(96, Math.ceil(textPx(tiltChars) * Math.sin((40 * Math.PI) / 180) + 18))

  const radius: [number, number, number, number] = horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]
  const valueAxis = { axisLine: false, tickLine: false, tick: axisTick(theme), tickFormatter: (v: number) => formatAxisValue(v, format) }

  return (
    <ChartFrame {...frame} height={height} empty={categories.length === 0 || isEmptySeries(series)}>
      <div className='flex size-full flex-col gap-2'>
        {series.length > 1 && <ChartLegend items={series.map((s, i) => ({ name: s.name, color: colors[i] }))} />}
        <div ref={boxRef} className='min-h-0 flex-1'>
          <ResponsiveContainer width='100%' height='100%' initialDimension={{ width: 320, height }}>
            <RBarChart
              data={data}
              layout={horizontal ? 'vertical' : 'horizontal'}
              margin={{ top: 6, right: 12, bottom: 0, left: 0 }}
              stackOffset={stacked ? 'sign' : 'none'}
              barCategoryGap={horizontal ? '19%' : '21%'}
              barGap={2}
              accessibilityLayer={false}
              style={{ fontFamily: theme.fontFamily }}
            >
              <CartesianGrid horizontal={!horizontal} vertical={Boolean(horizontal)} stroke={theme.color.border} strokeDasharray='3 3' />
              {horizontal ? (
                <>
                  <XAxis type='number' {...valueAxis} tickMargin={6} />
                  <YAxis
                    type='category'
                    dataKey='label'
                    width={nameCol}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    tick={({ x, y, payload }: YAxisTickContentProps) => (

                      // Plain <text>: recharts' own tick would wrap a long name onto two lines.
                      <text x={x} y={y} dy={4} textAnchor='end' fill={theme.color.foreground} fontSize={12}>
                        {truncate(String(payload?.value ?? ''), nameChars)}
                      </text>
                    )}
                  />
                </>
              ) : (
                <>
                  <XAxis
                    dataKey='label'
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    tick={axisTick(theme)}
                    tickMargin={tilt ? 4 : 8}
                    angle={tilt ? -40 : 0}
                    textAnchor={tilt ? 'end' : 'middle'}
                    height={tilt ? tiltHeight : 30}
                    tickFormatter={(v: string) => (tilt ? truncate(String(v), TILT_MAX_CHARS) : String(v))}
                  />
                  <YAxis width='auto' {...valueAxis} />
                </>
              )}
              <Tooltip
                content={seriesTooltip(series, colors, fmt)}
                cursor={{ fill: theme.color.muted, fillOpacity: 0.6 }}
                isAnimationActive={false}
                wrapperStyle={{ zIndex: 20, outline: 'none' }}
              />
              {series.map((s, i) => (
                <Bar
                  key={i}
                  dataKey={key(i)}
                  name={s.name}
                  fill={colors[i]}
                  fillOpacity={0.95}
                  maxBarSize={horizontal ? 32 : 64}
                  stackId={stacked ? 'stack' : undefined}
                  radius={stacked ? undefined : radius}
                  shape={stacked ? stackedBarShape(i, Boolean(horizontal)) : undefined}
                  isAnimationActive
                  animationDuration={ANIMATION_MS}
                />
              ))}
            </RBarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartFrame>
  )
}

/** Parts of a whole. Keep it to a handful of slices — fold the tail into "Other" before passing it. */
export type DonutChartProps = CommonChartProps & {
  labels: string[]
  values: number[]
  colors?: ChartColor[]

  /** The label in the middle, over the total ("Total"). */
  totalLabel?: string
}

export const DonutChart = ({ labels, values, colors, totalLabel = 'Total', height = 260, format = 'number', currency, ...frame }: DonutChartProps) => {
  const theme = useChartTheme()
  const [boxRef, box] = useBoxSize()
  const [active, setActive] = useState<number | null>(null)
  const fmt = valueFormatter(format, currency)

  const fills = useMemo(() => labels.map((_, i) => theme.resolve(colors?.[i], i)), [labels, colors, theme])
  const data = useMemo(() => labels.map((name, i) => ({ name, value: Math.max(0, Number(values[i]) || 0) })), [labels, values])
  const total = data.reduce((a, d) => a + d.value, 0)

  // The ring fills the box; the hole is 68% of it, and its text is sized to fit inside the hole.
  const outer = Math.max(0, Math.min(box.width, box.height) / 2 - 4)
  const inner = outer * 0.68
  const shown = active !== null && data[active] ? data[active] : { name: totalLabel, value: total }
  const valueText = fmt(shown.value)
  const room = inner * 2 * 0.84
  const valueSize = Math.max(9, Math.min(18, room / (valueText.length * 0.6)))
  const nameSize = Math.max(9, Math.min(12, valueSize * 0.75))

  const DonutTooltip = ({ active: on, payload }: TooltipContentProps) => {
    const p = on ? payload?.[0] : undefined

    if (!p) return null
    const i = labels.indexOf(String(p.name))

    return <TooltipBox rows={[{ key: String(p.name), name: String(p.name), color: fills[i] ?? theme.color.foreground, value: Number(p.value) }]} format={fmt} />
  }

  return (
    <ChartFrame {...frame} height={height} empty={labels.length === 0 || values.every(v => !v)}>
      <div className='flex size-full flex-col gap-2'>
        <div ref={boxRef} className='relative min-h-0 flex-1'>
          {outer > 0 && (
            <ResponsiveContainer width='100%' height='100%' initialDimension={{ width: 320, height }}>
              <PieChart accessibilityLayer={false} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} style={{ fontFamily: theme.fontFamily }}>
                <Tooltip content={DonutTooltip} isAnimationActive={false} wrapperStyle={{ zIndex: 20, outline: 'none' }} />
                <Pie
                  data={data}
                  dataKey='value'
                  nameKey='name'
                  innerRadius={inner}
                  outerRadius={outer}
                  startAngle={90}
                  endAngle={-270}

                  // The gap between slices; a lone slice would only show it as a seam at 12 o'clock.
                  stroke={theme.color.card}
                  strokeWidth={data.filter(d => d.value).length > 1 ? 2 : 0}
                  isAnimationActive
                  animationDuration={ANIMATION_MS}
                  onMouseEnter={(_, i) => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                >
                  {data.map((d, i) => (
                    <Cell key={d.name + i} fill={fills[i]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className='pointer-events-none absolute inset-0 flex items-center justify-center' aria-hidden>
            <div className='flex flex-col items-center text-center leading-tight' style={{ maxWidth: room || undefined }}>
              <span className='text-muted-foreground max-w-full truncate' style={{ fontSize: nameSize }}>
                {shown.name}
              </span>
              <span className='text-foreground font-semibold whitespace-nowrap tabular-nums' style={{ fontSize: valueSize }}>
                {valueText}
              </span>
            </div>
          </div>
        </div>
        <ChartLegend align='center' items={labels.map((l, i) => ({ name: l, color: fills[i] }))} />
      </div>
    </ChartFrame>
  )
}

/** A tiny trend with no axes, for a KPI tile. Hover still shows the value. */
export type SparklineProps = {
  data: (number | null)[]
  ariaLabel: string
  color?: ChartColor
  kind?: 'line' | 'area' | 'bar'
  height?: number
  format?: CommonChartProps['format']
  currency?: string | null

  /** Labels for the tooltip, one per point (e.g. bucket labels). */
  labels?: string[]
  className?: string
}

export const Sparkline = ({ data, ariaLabel, color = 'chart-1', kind = 'area', height = 40, format = 'number', currency, labels, className }: SparklineProps) => {
  const theme = useChartTheme()
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const stroke = theme.resolve(color, 0)
  const fmt = valueFormatter(format, currency)

  const rows = useMemo(() => data.map((v, i) => ({ label: labels?.[i] ?? '', v })), [data, labels])

  // The y range is the data's own range, so the trend uses the whole height. A flat-zero series has
  // no range: pin it to the floor rather than let it float. Bars always start from zero.
  const domain = useMemo<[number, number]>(() => {
    const nums = data.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))

    if (nums.every(v => v === 0)) return [0, 1]
    let lo = Math.min(...nums)
    let hi = Math.max(...nums)

    if (kind === 'bar') {
      lo = Math.min(0, lo)
      hi = Math.max(0, hi)
    }

    if (lo === hi) return [lo - Math.abs(lo || 1), hi + Math.abs(hi || 1)]

    return [lo, hi]
  }, [data, kind])

  const SparkTooltip = ({ active, payload, label }: TooltipContentProps) => {
    const p = active ? payload?.[0] : undefined

    if (!p || p.value === null || p.value === undefined) return null

    return <TooltipBox label={labels ? (label as ReactNode) : undefined} rows={[{ key: 'v', name: '', color: stroke, value: Number(p.value) }]} format={fmt} />
  }

  if (data.length < 2) return <div className={className} style={{ height }} aria-hidden />

  return (
    <ChartFrame ariaLabel={ariaLabel} height={height} className={className}>
      <ResponsiveContainer width='100%' height='100%' initialDimension={{ width: 200, height }}>
        <ComposedChart data={rows} margin={{ top: 3, right: 3, bottom: 3, left: 3 }} barCategoryGap='15%' accessibilityLayer={false}>
          {kind === 'area' && (
            <defs>
              <linearGradient id={`${uid}-spark`} x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor={stroke} stopOpacity={0.3} />
                <stop offset='100%' stopColor={stroke} stopOpacity={0.02} />
              </linearGradient>
            </defs>
          )}
          <XAxis dataKey='label' hide />
          <YAxis hide domain={domain} allowDataOverflow />
          <Tooltip
            content={SparkTooltip}
            cursor={kind === 'bar' ? { fill: theme.color.muted, fillOpacity: 0.6 } : { stroke: theme.color.border, strokeWidth: 1 }}
            isAnimationActive={false}
            allowEscapeViewBox={{ x: false, y: true }}
            wrapperStyle={{ zIndex: 20, outline: 'none' }}
          />
          {kind === 'bar' ? (
            <Bar dataKey='v' fill={stroke} fillOpacity={0.9} radius={2} isAnimationActive={false} />
          ) : kind === 'area' ? (
            <Area
              dataKey='v'
              type='monotone'
              stroke={stroke}
              strokeWidth={2}
              fill={`url(#${uid}-spark)`}
              fillOpacity={1}
              baseValue={domain[0]}
              dot={false}
              activeDot={{ r: 3, fill: stroke, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          ) : (
            <Line dataKey='v' type='monotone' stroke={stroke} strokeWidth={2} dot={false} activeDot={{ r: 3, fill: stroke, strokeWidth: 0 }} isAnimationActive={false} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
