import { useState } from 'react'
import { FormDots, WinRateBar } from '../components/Charts.tsx'
import { TeamMark } from '../components/Entities.tsx'
import { EmptyState, PageHeader, SearchInput, Segmented, Toolbar } from '../components/Layout.tsx'
import type { Season, Team } from '../data/model.ts'
import { formatAverage, formatRecord, plural } from '../format.ts'
import { useTitle } from '../hooks.ts'
import { paths } from '../router.ts'

type Order = 'rank' | 'name'

export function TeamsPage({ season }: { season: Season }) {
  useTitle(`${season.label} teams`)
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState<Order>('rank')
  const needle = query.trim().toLowerCase()
  const teams = season.teams
    .filter((team) => !needle || team.name.toLowerCase().includes(needle) || team.roster.some((slot) => slot.player.riotId.toLowerCase().includes(needle)))
    .sort((a, b) => (order === 'name' ? a.name.localeCompare(b.name) : a.rank - b.rank || a.name.localeCompare(b.name)))

  return (
    <>
      <PageHeader eyebrow={season.label} title="Teams">
        {plural(season.teams.length, 'team')} · {plural(season.players.length, 'rostered player')}
      </PageHeader>
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search teams or players" />
        <Segmented label="Sort teams" value={order} onChange={setOrder} options={[{ value: 'rank', label: 'Standings' }, { value: 'name', label: 'A–Z' }]} />
      </Toolbar>
      {teams.length === 0 ? (
        <EmptyState title="No teams found">Nothing matches “{query}”.</EmptyState>
      ) : (
        <div className="team-grid">
          {teams.map((team) => <TeamCard key={team.id} team={team} />)}
        </div>
      )}
    </>
  )
}

function TeamCard({ team }: { team: Team }) {
  const starters = team.roster.filter((slot) => !slot.sub)
  return (
    <a className="team-card" href={paths.team(team.seasonKey, team.id)}>
      <div className="team-card-head">
        <TeamMark team={team} size={48} />
        <div>
          <div className="team-card-name">{team.name}</div>
          <div className="muted small">#{team.rank} · {formatRecord(team.wins, team.losses)}</div>
        </div>
      </div>
      <WinRateBar wins={team.wins} losses={team.losses} />
      <div className="team-card-stats">
        <span><strong>{formatAverage(team.kills)}</strong> K/G</span>
        <span><strong>{formatAverage(team.towers)}</strong> Towers</span>
        <span><strong>{formatAverage(team.dragons)}</strong> Drakes</span>
      </div>
      <div className="team-card-roster">
        {starters.slice(0, 5).map((slot) => <span key={slot.player.puuid}>{slot.player.name}</span>)}
        {team.roster.length > starters.length && <span className="muted">+{plural(team.roster.length - starters.length, 'sub')}</span>}
      </div>
      <FormDots form={team.form} />
    </a>
  )
}
