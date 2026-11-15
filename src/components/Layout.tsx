import type { ReactNode } from 'react'

export function PageHeader({ eyebrow, title, children, aside, media }: { eyebrow?: ReactNode; title: ReactNode; children?: ReactNode; aside?: ReactNode; media?: ReactNode }) {
  return (
    <header className="page-header">
      {media}
      <div className="page-header-main">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {children && <div className="page-header-meta">{children}</div>}
      </div>
      {aside && <div className="page-header-aside">{aside}</div>}
    </header>
  )
}

export function Section({ title, action, children, className = '', id }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section className={`section ${className}`} id={id}>
      <div className="section-head">
        <h2>{title}</h2>
        {action && <div className="section-action">{action}</div>}
      </div>
      {children}
    </section>
  )
}

export function Panel({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`panel ${className}`}>
      {(title || action) && (
        <div className="panel-head">
          {title && <h3>{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

export function StatTile({ label, value, detail, highlight }: { label: ReactNode; value: ReactNode; detail?: ReactNode; highlight?: boolean }) {
  return (
    <div className={`stat-tile ${highlight ? 'highlight' : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {detail && <div className="stat-detail">{detail}</div>}
    </div>
  )
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="stat-grid">{children}</div>
}

export function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: ReactNode }[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={option.value === value ? 'active' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="search-input">
      <span className="visually-hidden">{placeholder}</span>
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="8.5" cy="8.5" r="5.5" />
        <path d="m13 13 4 4" />
      </svg>
      <input type="search" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="toolbar">{children}</div>
}

export function EmptyState({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-mark" aria-hidden="true">◇</div>
      <h2>{title}</h2>
      {children && <div className="muted">{children}</div>}
    </div>
  )
}

export function Badge({ children, tone = 'silver' }: { children: ReactNode; tone?: 'silver' | 'win' | 'loss' | 'muted' | 'blue' | 'red' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}
