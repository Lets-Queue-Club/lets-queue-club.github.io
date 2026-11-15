import type { Match, Side } from '../data/model.ts'
import { formatDuration } from '../format.ts'
import { paths } from '../router.ts'
import { TeamMark } from './Entities.tsx'

function SideRow({ side }: { side: Side }) {
  const state = side.won === true ? 'won' : side.won === false ? 'lost' : ''
  return (
    <div className={`match-side ${side.side} ${state}`}>
      <span className={`side-pip ${side.side}`} title={side.side === 'blue' ? 'Blue side' : 'Red side'} aria-hidden="true" />
      <TeamMark team={side.team} size={28} />
      <span className="match-team-name">{side.team.name}</span>
      {side.won && <span className="match-win-tag">W</span>}
      <span className="match-kills">{side.stats?.kills ?? ''}</span>
    </div>
  )
}

export function MatchCard({ match }: { match: Match }) {
  const status = match.forfeit
    ? 'Forfeit'
    : match.duration
      ? formatDuration(match.duration)
      : match.winner
        ? 'Final'
        : 'Not played'
  return (
    <a className={`match-card ${match.forfeit ? 'forfeit' : ''}`} href={paths.match(match.seasonKey, match.id)}>
      <SideRow side={match.blue} />
      <SideRow side={match.red} />
      <span className="match-meta">
        <span>{status}</span>
        <span className="match-details">Details →</span>
      </span>
    </a>
  )
}
