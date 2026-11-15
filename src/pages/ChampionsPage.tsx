import { useMemo, useState } from 'react'
import { WinRateBar } from '../components/Charts.tsx'
import { DataTable, type Column } from '../components/DataTable.tsx'
import { ChampionLink, PlayerLink } from '../components/Entities.tsx'
import { EmptyState, PageHeader, SearchInput, Section, Segmented, Toolbar } from '../components/Layout.tsx'
import { POSITIONS, type ChampionSeason, type Season } from '../data/model.ts'
import { formatNumber, formatPercent, formatRecord, plural, positionLabel } from '../format.ts'
import { useTitle } from '../hooks.ts'

type Grouping = 'all' | 'position'
type Filter = 'all' | 'picked' | 'unpicked'

function championColumns(season: Season, showRole: boolean): Column<ChampionSeason>[] {
  const columns: Column<ChampionSeason>[] = [
    { key: 'champion', label: 'Champion', render: (c) => <ChampionLink season={season.key} id={c.id} />, sort: (c) => c.name, className: 'col-primary' },
    {
      key: 'presence',
      label: 'Presence',
      title: 'Share of played games where the champion was picked or banned',
      render: (c) => (
        <span className="winrate">
          <span className="winrate-track" aria-hidden="true"><span className="winrate-fill gold" style={{ width: `${(c.presence ?? 0) * 100}%` }} /></span>
          <span className="winrate-value">{formatPercent(c.presence)}</span>
        </span>
      ),
      sort: (c) => c.presence,
      descending: true,
    },
    { key: 'picks', label: 'Picks', align: 'end', render: (c) => c.picks, sort: (c) => c.picks },
    { key: 'bans', label: 'Bans', align: 'end', render: (c) => c.bans, sort: (c) => c.bans },
    { key: 'record', label: 'W–L', align: 'end', render: (c) => (c.picks ? formatRecord(c.totals.wins, c.totals.losses) : '—'), sort: (c) => (c.picks ? c.totals.wins - c.totals.losses : null) },
    { key: 'winRate', label: 'Win rate', render: (c) => (c.picks ? <WinRateBar wins={c.totals.wins} losses={c.totals.losses} /> : '—'), sort: (c) => c.totals.winRate, descending: true },
    { key: 'kda', label: 'KDA', align: 'end', render: (c) => formatNumber(c.totals.kda, 2), sort: (c) => c.totals.kda },
  ]
  if (showRole) {
    columns.push({ key: 'role', label: 'Role', render: (c) => positionLabel(c.totals.mainPosition), sort: (c) => c.totals.mainPosition })
  }
  columns.push(
    { key: 'players', label: 'Players', align: 'end', render: (c) => c.players.length || '—', sort: (c) => c.players.length },
    {
      key: 'top',
      label: 'Most games',
      render: (c) => {
        const best = c.players[0]
        return best ? <span className="entity-stack"><PlayerLink season={season.key} player={best.player} /><span className="muted small">{plural(best.games, 'game')}</span></span> : '—'
      },
    },
  )
  return columns
}

export function ChampionsPage({ season }: { season: Season }) {
  useTitle(`${season.label} champions`)
  const [query, setQuery] = useState('')
  const [grouping, setGrouping] = useState<Grouping>('all')
  const [filter, setFilter] = useState<Filter>('all')

  const champions = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return season.champions.filter(
      (c) => (!needle || c.name.toLowerCase().includes(needle)) && (filter === 'all' || (filter === 'picked' ? c.picks > 0 : c.picks === 0)),
    )
  }, [season, query, filter])

  return (
    <>
      <PageHeader eyebrow={season.label} title="Champions">
        {plural(season.summary.uniquePicks, 'champion')} picked · {plural(season.summary.uniqueBans, 'champion')} banned
      </PageHeader>
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search champions" />
        <Segmented label="Show" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'picked', label: 'Picked' }, { value: 'unpicked', label: 'Banned only' }]} />
        <Segmented label="Group by" value={grouping} onChange={setGrouping} options={[{ value: 'all', label: 'Table' }, { value: 'position', label: 'By role' }]} />
      </Toolbar>
      {champions.length === 0 ? (
        <EmptyState title="No champions found">Nothing matches “{query}”.</EmptyState>
      ) : grouping === 'all' ? (
        <DataTable caption={`${season.label} champions`} rows={champions} columns={championColumns(season, true)} rowKey={(c) => String(c.id)} numbered />
      ) : (
        [...POSITIONS, null].map((position) => {
          const rows = champions.filter((c) => c.totals.mainPosition === position)
          if (rows.length === 0) return null
          return (
            <Section key={position ?? 'none'} title={position ? positionLabel(position) : 'Banned only'} action={<span className="muted small">{plural(rows.length, 'champion')}</span>}>
              <DataTable rows={rows} columns={championColumns(season, false)} rowKey={(c) => String(c.id)} initialSort={{ key: 'picks', descending: true }} />
            </Section>
          )
        })
      )}
    </>
  )
}
