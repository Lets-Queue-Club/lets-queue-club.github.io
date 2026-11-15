import type { ReactNode } from 'react'
import { ChampionIcon, PlayerLink, TeamLink } from '../components/Entities.tsx'
import { PageHeader, Section } from '../components/Layout.tsx'
import { top, type Ranked } from '../data/insights.ts'
import type { Match, Participant, PlayerSeason, Season } from '../data/model.ts'
import { formatCompact, formatDuration, formatNumber, roundLabel } from '../format.ts'
import { useTitle } from '../hooks.ts'
import { paths } from '../router.ts'

interface RecordCardProps<T> {
  title: string
  entries: Ranked<T>[]
  format: (value: number) => string
  render: (item: T) => ReactNode
  link: (item: T) => string
}

function RecordCard<T>({ title, entries, format, render, link }: RecordCardProps<T>) {
  const [best, ...rest] = entries
  return (
    <article className="record-card">
      <h3>{title}</h3>
      {best ? (
        <>
          <div className="record-best">
            <a className="record-value" href={link(best.item)}>{format(best.value)}</a>
            <span className="record-holder">{render(best.item)}</span>
          </div>
          {rest.length > 0 && (
            <ol className="record-rest" start={2}>
              {rest.map((entry, index) => (
                <li key={index}>
                  <span className="record-holder">{render(entry.item)}</span>
                  <a className="record-rest-value" href={link(entry.item)}>{format(entry.value)}</a>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <p className="muted small">No games yet.</p>
      )}
    </article>
  )
}

export function RecordsPage({ season }: { season: Season }) {
  useTitle(`${season.label} records`)
  const participants = season.participants
  const played = season.matches.filter((match) => match.hasData && !match.forfeit)
  const sides = played.flatMap((match) => [match.blue, match.red]).filter((side) => side.stats)
  const kills = (match: Match) => (match.blue.stats?.kills ?? NaN) + (match.red.stats?.kills ?? NaN)

  const performance = (p: Participant) => (
    <span className="entity-stack">
      <ChampionIcon id={p.championId} size={26} />
      <span>
        <PlayerLink season={season.key} player={p.player} />
        <span className="muted small"> {roundLabel(p.match.round)} vs {p.side.opponent.team.name}</span>
      </span>
    </span>
  )
  const matchup = (match: Match) => (
    <span>
      {match.blue.team.name} <span className="muted">vs</span> {match.red.team.name}
      <span className="muted small"> · {roundLabel(match.round)}</span>
    </span>
  )
  const playerTotal = (entry: PlayerSeason) => <PlayerLink season={season.key} player={entry.player} />
  const participantLink = (p: Participant) => paths.match(p.match.seasonKey, p.match.id)
  const matchLink = (match: Match) => paths.match(match.seasonKey, match.id)
  const playerLink = (entry: PlayerSeason) => paths.player(season.key, entry.player.puuid)
  const integer = (value: number) => formatNumber(value)

  return (
    <>
      <PageHeader eyebrow={season.label} title="Records">
        Single-game highs and season totals
      </PageHeader>

      <Section title="Single-game performances">
        <div className="record-grid">
          <RecordCard title="Most kills" entries={top(participants, (p) => p.kills)} format={integer} render={performance} link={participantLink} />
          <RecordCard title="Most assists" entries={top(participants, (p) => p.assists)} format={integer} render={performance} link={participantLink} />
          <RecordCard
            title="Best KDA"
            entries={top(participants, (p) => (p.kills === null || p.deaths === null || p.assists === null ? null : (p.kills + p.assists) / Math.max(1, p.deaths)))}
            format={(value) => formatNumber(value, 1)}
            render={performance}
            link={participantLink}
          />
          <RecordCard title="Most damage" entries={top(participants, (p) => p.damage)} format={formatCompact} render={performance} link={participantLink} />
          <RecordCard title="Most CS" entries={top(participants, (p) => p.cs)} format={integer} render={performance} link={participantLink} />
          <RecordCard title="Most gold" entries={top(participants, (p) => p.gold)} format={formatCompact} render={performance} link={participantLink} />
          <RecordCard title="Most deaths" entries={top(participants, (p) => p.deaths)} format={integer} render={performance} link={participantLink} />
          <RecordCard
            title="CS per minute"
            entries={top(participants, (p) => (p.cs !== null && p.match.duration ? p.cs / (p.match.duration / 60) : null))}
            format={(value) => formatNumber(value, 1)}
            render={performance}
            link={participantLink}
          />
        </div>
      </Section>

      <Section title="Games">
        <div className="record-grid">
          <RecordCard title="Longest game" entries={top(played, (match) => match.duration)} format={formatDuration} render={matchup} link={matchLink} />
          <RecordCard title="Shortest game" entries={top(played, (match) => match.duration, 5, true)} format={formatDuration} render={matchup} link={matchLink} />
          <RecordCard title="Bloodiest game" entries={top(played, kills)} format={integer} render={matchup} link={matchLink} />
          <RecordCard
            title="Biggest stomp"
            entries={top(played, (match) => Math.abs((match.blue.stats?.kills ?? NaN) - (match.red.stats?.kills ?? NaN)))}
            format={(value) => `+${formatNumber(value)}`}
            render={matchup}
            link={matchLink}
          />
          <RecordCard
            title="Most team kills"
            entries={top(sides, (side) => side.stats?.kills ?? null)}
            format={integer}
            render={(side) => <span><TeamLink team={side.team} /> <span className="muted small">vs {side.opponent.team.name}</span></span>}
            link={(side) => matchLink(side.match)}
          />
          <RecordCard
            title="Most dragons"
            entries={top(sides, (side) => side.stats?.dragons ?? null)}
            format={integer}
            render={(side) => <span><TeamLink team={side.team} /> <span className="muted small">vs {side.opponent.team.name}</span></span>}
            link={(side) => matchLink(side.match)}
          />
        </div>
      </Section>

      <Section title="Season totals">
        <div className="record-grid">
          <RecordCard title="Total kills" entries={top(season.players, (entry) => (entry.kills.count ? entry.kills.sum : null))} format={integer} render={playerTotal} link={playerLink} />
          <RecordCard title="Total assists" entries={top(season.players, (entry) => (entry.assists.count ? entry.assists.sum : null))} format={integer} render={playerTotal} link={playerLink} />
          <RecordCard title="Total damage" entries={top(season.players, (entry) => (entry.damage.count ? entry.damage.sum : null))} format={formatCompact} render={playerTotal} link={playerLink} />
          <RecordCard title="Deepest champion pool" entries={top(season.players, (entry) => entry.champions.length || null)} format={integer} render={playerTotal} link={playerLink} />
        </div>
      </Section>
    </>
  )
}
