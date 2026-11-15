import { useMemo, useState } from 'react'
import { DataTable } from '../components/DataTable.tsx'
import { TeamLink } from '../components/Entities.tsx'
import { EmptyState, PageHeader, SearchInput, Section, Segmented, Toolbar } from '../components/Layout.tsx'
import { playerColumns, type PlayerRow } from '../columns.tsx'
import { qualifyingGames } from '../data/insights.ts'
import { POSITIONS, type Season } from '../data/model.ts'
import { plural, positionLabel } from '../format.ts'
import { useTitle } from '../hooks.ts'

type Grouping = 'all' | 'team' | 'position'

export function PlayersPage({ season }: { season: Season }) {
  useTitle(`${season.label} players`)
  const [query, setQuery] = useState('')
  const [position, setPosition] = useState('')
  const [grouping, setGrouping] = useState<Grouping>('all')
  const [qualifiedOnly, setQualifiedOnly] = useState(true)
  const minimum = qualifyingGames(season)

  const rows = useMemo<PlayerRow[]>(() => {
    const needle = query.trim().toLowerCase()
    return season.players.filter(
      (entry) =>
        (!needle || entry.player.riotId.toLowerCase().includes(needle) || entry.teams.some((team) => team.name.toLowerCase().includes(needle))) &&
        (!position || entry.mainPosition === position) &&
        (!qualifiedOnly || entry.games >= minimum),
    )
  }, [season, query, position, qualifiedOnly, minimum])

  const groups = useMemo(() => {
    if (grouping === 'position') {
      return [...POSITIONS, null]
        .map((key) => ({ key: key ?? 'none', title: key ? positionLabel(key) : 'No games played', rows: rows.filter((row) => row.mainPosition === key) }))
        .filter((group) => group.rows.length > 0)
    }
    if (grouping === 'team') {
      return season.teams
        .map((team) => ({ key: team.id, title: <TeamLink team={team} />, rows: rows.filter((row) => row.primaryTeam === team) }))
        .filter((group) => group.rows.length > 0)
    }
    return []
  }, [grouping, rows, season])

  return (
    <>
      <PageHeader eyebrow={season.label} title="Players">
        {plural(season.players.filter((entry) => entry.games > 0).length, 'player')} with games played · click a header to sort
      </PageHeader>
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search players or teams" />
        <Segmented
          label="Role"
          value={position}
          onChange={setPosition}
          options={[{ value: '', label: 'All roles' }, ...POSITIONS.map((key) => ({ value: key, label: positionLabel(key) }))]}
        />
        <Segmented
          label="Group by"
          value={grouping}
          onChange={setGrouping}
          options={[{ value: 'all', label: 'Leaderboard' }, { value: 'team', label: 'By team' }, { value: 'position', label: 'By role' }]}
        />
        <label className="check">
          <input type="checkbox" checked={qualifiedOnly} onChange={(event) => setQualifiedOnly(event.target.checked)} />
          {minimum}+ games
        </label>
      </Toolbar>

      {rows.length === 0 ? (
        <EmptyState title="No players found">Try a different search or role.</EmptyState>
      ) : grouping === 'all' ? (
        <DataTable
          caption={`${season.label} players`}
          rows={rows}
          columns={playerColumns(season.key)}
          rowKey={(row) => row.player.puuid}
          initialSort={{ key: 'kda', descending: true }}
          numbered
        />
      ) : (
        groups.map((group) => (
          <Section key={group.key} title={group.title} action={<span className="muted small">{plural(group.rows.length, 'player')}</span>}>
            <DataTable
              rows={group.rows}
              columns={playerColumns(season.key, { team: grouping !== 'team', position: grouping !== 'position' })}
              rowKey={(row) => row.player.puuid}
              initialSort={{ key: 'games', descending: true }}
            />
          </Section>
        ))
      )}
    </>
  )
}
