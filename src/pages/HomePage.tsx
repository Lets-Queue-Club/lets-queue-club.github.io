import { TeamMark } from '../components/Entities.tsx'
import { FormDots } from '../components/Charts.tsx'
import { MatchCard } from '../components/MatchCard.tsx'
import { Section } from '../components/Layout.tsx'
import { useData } from '../data/context.ts'
import { average, type Season } from '../data/model.ts'
import { formatDuration, formatNumber, formatRecord, plural, roundLabel } from '../format.ts'
import { useTitle } from '../hooks.ts'
import { paths, type SeasonView } from '../router.ts'

const EXPLORE: { view: SeasonView; title: string; description: string; count: (season: Season) => string }[] = [
  { view: 'standings', title: 'Standings', description: 'Records, streaks and form for every team.', count: (s) => plural(s.teams.length, 'team') },
  { view: 'matches', title: 'Matches', description: 'Every result, week by week, with full box scores.', count: (s) => plural(s.matches.length, 'match', 'matches') },
  { view: 'players', title: 'Players', description: 'Leaderboards by role, team, and every stat.', count: (s) => plural(s.players.filter((p) => p.games).length, 'player') },
  { view: 'champions', title: 'Champions', description: 'Picks, bans, presence, and who plays what.', count: (s) => plural(s.summary.uniquePicks, 'champion') },
  { view: 'teams', title: 'Teams', description: 'Rosters, objectives, and match history.', count: (s) => plural(s.teams.length, 'roster') },
  { view: 'records', title: 'Records', description: 'The biggest games and best single performances.', count: () => 'Single-game highs' },
]

export function HomePage() {
  const { league, loading, error } = useData()
  useTitle(null)
  const latest = league?.latest ?? null
  const leaders = latest?.teams.filter((team) => team.rank === 1 && team.games > 0) ?? []
  const lastRound = latest?.rounds.findLast((round) => round.matches.some((match) => match.winner))

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Community League of Legends</p>
          <h1 className="hero-title">
            Good games.<br />Great company.<br /><span className="gold-text">Let&apos;s queue.</span>
          </h1>
          <p className="hero-lede">
            Standings, results, and stats for every Let&apos;s Queue Club season, straight from the club&apos;s records.
          </p>
          <div className="hero-actions">
            {latest ? (
              <>
                <a className="button primary" href={paths.season(latest.key)}>Explore {latest.label} <span aria-hidden="true">→</span></a>
                <a className="button" href={paths.season(latest.key, 'standings')}>Standings</a>
              </>
            ) : (
              <span className="button primary disabled" aria-disabled="true">{loading ? 'Loading seasons…' : 'No seasons yet'}</span>
            )}
          </div>
        </div>

        <div className="spotlight">
          {latest ? (
            <>
              <div className="spotlight-head">
                <span className="eyebrow">{latest.label}</span>
                <span className="muted small">{latest.rounds.length ? `Through ${roundLabel(latest.rounds.at(-1)!.round).toLowerCase()}` : ''}</span>
              </div>
              {leaders.length > 0 ? (
                <div className="spotlight-leaders">
                  <span className="spotlight-crown">{leaders.length > 1 ? 'Tied for first' : 'First place'}</span>
                  {leaders.slice(0, 2).map((team) => (
                    <a key={team.id} className="spotlight-team" href={paths.team(latest.key, team.id)}>
                      <TeamMark team={team} size={56} />
                      <span>
                        <span className="spotlight-name">{team.name}</span>
                        <span className="spotlight-record">{formatRecord(team.wins, team.losses)} <FormDots form={team.form} /></span>
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="muted">No results yet.</p>
              )}
              <dl className="spotlight-stats">
                <div><dt>Matches</dt><dd>{formatNumber(latest.summary.matches)}</dd></div>
                <div><dt>Kills / game</dt><dd>{formatNumber(average(latest.summary.kills), 1)}</dd></div>
                <div><dt>Avg game</dt><dd>{formatDuration(average(latest.summary.duration))}</dd></div>
              </dl>
            </>
          ) : (
            <div className="spotlight-loading">
              {error && !loading ? <p className="muted">The season data couldn&apos;t be loaded. {error}</p> : <div className="skeleton-stack"><span /><span /><span /></div>}
            </div>
          )}
        </div>
      </section>

      {league && latest && (
        <>
          <Section title={`Explore ${latest.label}`}>
            <div className="explore-grid">
              {EXPLORE.map((item) => (
                <a key={item.view} className="explore-card" href={paths.season(latest.key, item.view)}>
                  <span className="explore-count">{item.count(latest)}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <span className="explore-arrow" aria-hidden="true">→</span>
                </a>
              ))}
            </div>
          </Section>

          {lastRound && (
            <Section
              title={`Latest results · ${roundLabel(lastRound.round)}`}
              action={<a className="text-link" href={paths.season(latest.key, 'matches')}>All matches →</a>}
            >
              <div className="match-grid">
                {lastRound.matches.map((match) => <MatchCard key={match.id} match={match} />)}
              </div>
            </Section>
          )}

          <Section title="Seasons">
            <div className="season-grid">
              {league.seasons.map((season) => {
                const first = season.teams.find((team) => team.rank === 1 && team.games > 0)
                return (
                  <a key={season.key} className="season-card" href={paths.season(season.key)}>
                    <span className="season-number">{season.number ?? '?'}</span>
                    <span className="season-card-body">
                      <span className="season-card-title">{season.label}</span>
                      <span className="muted small">
                        {plural(season.teams.length, 'team')} · {plural(season.matches.length, 'match', 'matches')} · {plural(season.rounds.length, 'week')}
                      </span>
                      {first && <span className="season-card-leader">Leader: {first.name} ({formatRecord(first.wins, first.losses)})</span>}
                    </span>
                  </a>
                )
              })}
            </div>
          </Section>
        </>
      )}
    </div>
  )
}
