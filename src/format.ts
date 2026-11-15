import { POSITION_LABELS, average, type Total } from './data/model.ts'

export const EMPTY = '—'

/** What `Matches.Round` represents. Season 2 played one round per week. */
export const ROUND_LABEL = 'Week'

export const roundLabel = (round: number | null) => (round === null ? 'Unscheduled' : `${ROUND_LABEL} ${round}`)

export const positionLabel = (position: string | null) =>
  position ? (POSITION_LABELS[position] ?? position.charAt(0) + position.slice(1).toLowerCase()) : EMPTY

export function formatNumber(value: number | null, digits = 0): string {
  return value === null || !Number.isFinite(value)
    ? EMPTY
    : value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export const formatAverage = (total: Total, digits = 1) => formatNumber(average(total), digits)

export function formatCompact(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return EMPTY
  if (Math.abs(value) < 10000) return formatNumber(value)
  return `${formatNumber(value / 1000, 1)}k`
}

export function formatPercent(value: number | null, digits = 0): string {
  return value === null || !Number.isFinite(value) ? EMPTY : `${(value * 100).toFixed(digits)}%`
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return EMPTY
  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const rest = String(total % 60).padStart(2, '0')
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`
}

export const formatRecord = (wins: number, losses: number) => `${wins}–${losses}`

export function formatSigned(value: number | null, digits = 0): string {
  if (value === null || !Number.isFinite(value)) return EMPTY
  const text = formatNumber(Math.abs(value), digits)
  return value > 0 ? `+${text}` : value < 0 ? `−${text}` : text
}

export function formatDate(date: Date | null): string {
  return date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : EMPTY
}

export function formatTimeAgo(time: number, now = Date.now()): string {
  const minutes = Math.round((now - time) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  return new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const plural = (count: number, word: string, many = `${word}s`) =>
  `${formatNumber(count)} ${count === 1 ? word : many}`
