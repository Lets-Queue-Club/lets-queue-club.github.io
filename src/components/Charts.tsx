import type { ReactNode } from 'react'
import { formatPercent } from '../format.ts'

export interface BarItem {
  key: string
  label: ReactNode
  value: number
  display?: ReactNode
  /** Optional secondary note shown after the value. */
  note?: ReactNode
}

/** Horizontal bars, scaled to the largest value. */
export function BarList({ items, max, empty = 'No data yet.' }: { items: BarItem[]; max?: number; empty?: ReactNode }) {
  if (items.length === 0) return <p className="muted small">{empty}</p>
  const top = max ?? Math.max(...items.map((item) => item.value), 1)
  return (
    <ol className="bar-list">
      {items.map((item) => (
        <li key={item.key}>
          <div className="bar-list-label">{item.label}</div>
          <div className="bar-track" aria-hidden="true">
            <span className="bar-fill" style={{ width: `${Math.max(2, (item.value / top) * 100)}%` }} />
          </div>
          <div className="bar-list-value">
            {item.display ?? item.value}
            {item.note && <span className="muted"> {item.note}</span>}
          </div>
        </li>
      ))}
    </ol>
  )
}

/** Blue-vs-red comparison of one stat. */
export function SplitBar({ label, blue, red, format = (value) => String(value) }: { label: string; blue: number | null; red: number | null; format?: (value: number) => string }) {
  const known = blue !== null || red !== null
  const total = (blue ?? 0) + (red ?? 0)
  const bluePart = total > 0 ? ((blue ?? 0) / total) * 100 : 50
  return (
    <div className={`split-bar ${known ? '' : 'unknown'}`}>
      <span className={`split-value blue ${blue !== null && red !== null && blue > red ? 'lead' : ''}`}>{blue === null ? '—' : format(blue)}</span>
      <div className="split-middle">
        <span className="split-label">{label}</span>
        <div className="split-track" aria-hidden="true">
          <span className="split-blue" style={{ width: `${bluePart}%` }} />
          <span className="split-red" style={{ width: `${100 - bluePart}%` }} />
        </div>
      </div>
      <span className={`split-value red ${blue !== null && red !== null && red > blue ? 'lead' : ''}`}>{red === null ? '—' : format(red)}</span>
    </div>
  )
}

export interface ColumnItem {
  key: string
  label: string
  value: number | null
  display: string
}

/** Vertical columns, e.g. one per round. */
export function ColumnChart({ items, label }: { items: ColumnItem[]; label: string }) {
  const values = items.map((item) => item.value ?? 0)
  const max = Math.max(...values, 1)
  const min = Math.min(...values.filter((value) => value > 0), max)
  // Start the scale a little below the smallest value so differences show.
  const floor = Math.max(0, min - (max - min) * 0.6)
  return (
    <figure className="column-chart" aria-label={label}>
      <div className="column-chart-bars">
        {items.map((item) => (
          <div className="column" key={item.key} title={`${item.label}: ${item.display}`}>
            <span className="column-value">{item.display}</span>
            <span
              className="column-fill"
              style={{ height: item.value === null ? '0%' : `${Math.max(4, ((item.value - floor) / (max - floor || 1)) * 100)}%` }}
            />
            <span className="column-label">{item.label}</span>
          </div>
        ))}
      </div>
    </figure>
  )
}

export function FormDots({ form, limit = 5 }: { form: ('W' | 'L')[]; limit?: number }) {
  const recent = form.slice(-limit)
  if (recent.length === 0) return <span className="muted">—</span>
  return (
    <span className="form-dots" aria-label={`Last ${recent.length}: ${recent.join(' ')}`}>
      {recent.map((result, index) => (
        <span key={index} className={`form-dot ${result === 'W' ? 'win' : 'loss'}`} aria-hidden="true">{result}</span>
      ))}
    </span>
  )
}

export function WinRateBar({ wins, losses }: { wins: number; losses: number }) {
  const games = wins + losses
  const rate = games ? wins / games : null
  return (
    <span className="winrate" title={`${wins} wins, ${losses} losses`}>
      <span className="winrate-track" aria-hidden="true">
        <span className="winrate-fill" style={{ width: `${(rate ?? 0) * 100}%` }} />
      </span>
      <span className="winrate-value">{formatPercent(rate)}</span>
    </span>
  )
}

/** A ring showing one share, e.g. blue-side win rate. */
export function Ring({ value, label, detail }: { value: number | null; label: string; detail?: ReactNode }) {
  return (
    <div className="ring-wrap">
      <div className="ring" style={{ ['--ring-value' as string]: `${(value ?? 0) * 360}deg` }} role="img" aria-label={`${label}: ${formatPercent(value)}`}>
        <span>{formatPercent(value)}</span>
      </div>
      <div>
        <div className="ring-label">{label}</div>
        {detail && <div className="muted small">{detail}</div>}
      </div>
    </div>
  )
}
