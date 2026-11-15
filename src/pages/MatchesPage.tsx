import { useState } from 'react'
import { MatchCard } from '../components/MatchCard.tsx'
import { EmptyState, PageHeader, Section, Segmented, Toolbar } from '../components/Layout.tsx'
import type { Season } from '../data/model.ts'
import { plural, roundLabel } from '../format.ts'
import { useTitle } from '../hooks.ts'

type Status = 'all' | 'played' | 'forfeit' | 'pending'

export function MatchesPage({ season }: { season: Season }) {
  useTitle(`${season.label} matches`)
  const [teamId, setTeamId] = useState('')
  const [status, setStatus] = useState<Status>('all')

  const rounds = season.rounds
    .map((round) => ({
      ...round,
      matches: round.matches.filter((match) => {
        if (teamId && match.blue.team.id !== teamId && match.red.team.id !== teamId) return false
        if (status === 'played') return match.winner !== null && !match.forfeit
        if (status === 'forfeit') return match.forfeit
        if (status === 'pending') return match.winner === null
        return true
      }),
    }))
    .filter((round) => round.matches.length > 0)
  const shown = rounds.reduce((sum, round) => sum + round.matches.length, 0)
  const teams = [...season.teams].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <PageHeader eyebrow={season.label} title="Matches">
        {plural(season.matches.length, 'match', 'matches')} across {plural(season.rounds.length, 'week')}
      </PageHeader>
      <Toolbar>
        <label className="select">
          <span className="visually-hidden">Team</span>
          <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
            <option value="">All teams</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </label>
        <Segmented
          label="Result"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All' },
            { value: 'played', label: 'Played' },
            { value: 'forfeit', label: 'Forfeits' },
            { value: 'pending', label: 'Upcoming' },
          ]}
        />
        <span className="toolbar-count muted small">{plural(shown, 'match', 'matches')}</span>
      </Toolbar>
      {rounds.length === 0 ? (
        <EmptyState title="No matches found">Try another team or result filter.</EmptyState>
      ) : (
        rounds.map((round) => (
          <Section key={round.round ?? 'none'} title={roundLabel(round.round)} action={<span className="muted small">{plural(round.matches.length, 'match', 'matches')}</span>}>
            <div className="match-grid">
              {round.matches.map((match) => <MatchCard key={match.id} match={match} />)}
            </div>
          </Section>
        ))
      )}
    </>
  )
}
