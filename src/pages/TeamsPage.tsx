import { useState } from 'react'
import { EmptyState, PageHeader, SearchInput, Segmented, Toolbar } from '../components/Layout.tsx'
import { average, type Season, type Team } from '../data/model.ts'
import { formatAverage, formatCompact, formatRecord, plural } from '../format.ts'
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
        <Segmented label="Sort teams" value={order} onChange={setOrder} options={[{ value: 'rank', label: 'Rank' }, { value: 'name', label: 'A–Z' }]} />
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
  const stats = [
    { label: 'Kills / game', value: formatAverage(team.kills) },
    { label: 'Deaths / game', value: formatAverage(team.deaths) },
    { label: 'Gold / game', value: formatCompact(average(team.gold)) },
  ]
  return (
    <a className="team-card" href={paths.team(team.seasonKey, team.id)}>
      <div className="team-card-head">
        <div className="team-card-name">{team.name}</div>
        <div className="team-card-meta">
          <span className="team-card-rank">#{team.rank}</span>
          <span>{formatRecord(team.wins, team.losses)}</span>
        </div>
      </div>
      <div className="team-card-body">
        <dl className="team-card-stats">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
        <ul className="team-card-roster">
          {team.roster.map((slot) => (
            <li key={slot.player.puuid} className={slot.sub ? 'sub' : undefined}>
              {slot.player.name}
              {slot.sub && <span className="team-card-sub">Sub</span>}
            </li>
          ))}
        </ul>
      </div>
    </a>
  )
}
