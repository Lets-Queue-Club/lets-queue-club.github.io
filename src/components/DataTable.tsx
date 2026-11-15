import { useMemo, useState, type ReactNode } from 'react'

export type SortValue = number | string | null

export interface Column<T> {
  key: string
  label: ReactNode
  /** Tooltip explaining the column. */
  title?: string
  render: (row: T) => ReactNode
  /** Omit to make the column unsortable. */
  sort?: (row: T) => SortValue
  align?: 'start' | 'end' | 'center'
  /** Sort descending on the first click (default for numbers). */
  descending?: boolean
  className?: string
}

interface DataTableProps<T> {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  initialSort?: { key: string; descending: boolean }
  /** Shows a row number column that follows the current sort. */
  numbered?: boolean
  caption?: string
  empty?: ReactNode
  rowClassName?: (row: T) => string | undefined
}

function compare(a: SortValue, b: SortValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

export function DataTable<T>({ rows, columns, rowKey, initialSort, numbered, caption, empty, rowClassName }: DataTableProps<T>) {
  const [sort, setSort] = useState(initialSort ?? null)
  const sorted = useMemo(() => {
    const column = sort && columns.find((candidate) => candidate.key === sort.key)
    if (!sort || !column?.sort) return rows
    const valueOf = column.sort
    const { descending } = sort
    return rows
      .map((row, index) => ({ row, index, value: valueOf(row) }))
      .sort((a, b) => {
        // Unknown values always sink to the bottom, whatever the direction.
        if (a.value === null || b.value === null) return a.value === b.value ? a.index - b.index : a.value === null ? 1 : -1
        return (descending ? compare(b.value, a.value) : compare(a.value, b.value)) || a.index - b.index
      })
      .map((entry) => entry.row)
  }, [rows, columns, sort])

  const toggle = (column: Column<T>) => {
    setSort((current) =>
      current?.key === column.key
        ? { key: column.key, descending: !current.descending }
        : { key: column.key, descending: column.descending ?? column.align === 'end' },
    )
  }

  return (
    <div className="table-scroll">
      <table className="data-table">
        {caption && <caption className="visually-hidden">{caption}</caption>}
        <thead>
          <tr>
            {numbered && <th scope="col" className="align-end col-number">#</th>}
            {columns.map((column) => {
              const active = sort?.key === column.key
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={`align-${column.align ?? 'start'} ${column.className ?? ''}`}
                  aria-sort={active ? (sort.descending ? 'descending' : 'ascending') : undefined}
                  title={column.title}
                >
                  {column.sort ? (
                    <button type="button" className={`sort-button ${active ? 'active' : ''}`} onClick={() => toggle(column)}>
                      {column.label}
                      <span className="sort-arrow" aria-hidden="true">{active ? (sort.descending ? '▼' : '▲') : '↕'}</span>
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td className="table-empty" colSpan={columns.length + (numbered ? 1 : 0)}>{empty ?? 'Nothing to show.'}</td>
            </tr>
          )}
          {sorted.map((row, index) => (
            <tr key={rowKey(row)} className={rowClassName?.(row)}>
              {numbered && <td className="align-end col-number">{index + 1}</td>}
              {columns.map((column) => (
                <td key={column.key} className={`align-${column.align ?? 'start'} ${column.className ?? ''}`}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
