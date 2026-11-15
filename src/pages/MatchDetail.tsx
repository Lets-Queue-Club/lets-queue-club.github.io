import { SplitBar } from '../components/Charts.tsx'
import { DataTable, type Column } from '../components/DataTable.tsx'
import { ChampionIcon, ChampionLink, PlayerLink, TeamLink, TeamMark } from '../components/Entities.tsx'
import { Badge, EmptyState, Panel } from '../components/Layout.tsx'
import type { Match, Participant, Side } from '../data/model.ts'
import { formatCompact, formatDate, formatDuration, formatNumber, formatPercent, positionLabel, roundLabel } from '../format.ts'
import { useTitle } from '../hooks.ts'
import { paths } from '../router.ts'

const sum = (values: (number | null)[]) => values.reduce<number>((total, value) => total + (value ?? 0), 0)

function participantColumns(match: Match, side: Side): Column<Participant>[] {
  const minutes = match.duration ? match.duration / 60 : null
  const teamKills = side.stats?.kills ?? sum(side.participants.map((p) => p.kills))
  const teamDamage = sum(side.participants.map((p) => p.damage))
  return [
    { key: 'role', label: 'Role', render: (p) => <span className="role-tag">{positionLabel(p.position)}</span>, className: 'col-role' },
    { key: 'champion', label: 'Champion', render: (p) => <ChampionLink season={match.seasonKey} id={p.championId} size={30} />, sort: (p) => p.championId },
    { key: 'player', label: 'Player', render: (p) => <PlayerLink season={match.seasonKey} player={p.player} />, sort: (p) => p.player.name.toLowerCase(), className: 'col-primary' },
    {
      key: 'kda',
      label: 'K / D / A',
      align: 'center',
      render: (p) => (
        <span className="kda-line">
          {p.kills ?? '—'} / <span className="text-loss">{p.deaths ?? '—'}</span> / {p.assists ?? '—'}
        </span>
      ),
      sort: (p) => (p.kills === null || p.deaths === null || p.assists === null ? null : (p.kills + p.assists) / Math.max(1, p.deaths)),
      descending: true,
    },
    {
      key: 'kp',
      label: 'KP',
      title: 'Kill participation',
      align: 'end',
      render: (p) => formatPercent(teamKills ? ((p.kills ?? 0) + (p.assists ?? 0)) / teamKills : null),
      sort: (p) => (p.kills ?? 0) + (p.assists ?? 0),
    },
    { key: 'cs', label: 'CS', align: 'end', render: (p) => <>{formatNumber(p.cs)}{minutes && p.cs !== null && <span className="muted small"> {formatNumber(p.cs / minutes, 1)}</span>}</>, sort: (p) => p.cs },
    {
      key: 'damage',
      label: 'Damage',
      align: 'end',
      render: (p) => (
        <span className="damage-cell">
          {formatCompact(p.damage)}
          <span className="mini-bar" aria-hidden="true"><span style={{ width: `${teamDamage && p.damage ? (p.damage / teamDamage) * 100 : 0}%` }} /></span>
        </span>
      ),
      sort: (p) => p.damage,
    },
    { key: 'gold', label: 'Gold', align: 'end', render: (p) => formatCompact(p.gold), sort: (p) => p.gold },
  ]
}

function Bans({ side, season }: { side: Side; season: string }) {
  const bans = side.stats?.bans ?? []
  return (
    <div className={`bans ${side.side}`}>
      <span className="bans-label">{side.team.name}</span>
      <span className="icon-row picks">
        {side.participants.map((p) => (
          <a key={p.player.puuid} href={paths.champion(season, p.championId ?? '')} title={`${p.player.name} · ${positionLabel(p.position)}`}>
            <ChampionIcon id={p.championId} size={38} />
          </a>
        ))}
      </span>
      <span className="icon-row">
        <span className="muted small bans-caption">Bans</span>
        {bans.length === 0 && <span className="muted small">None recorded</span>}
        {bans.map((id, index) => (
          <a key={`${id}-${index}`} href={paths.champion(season, id)} className="ban">
            <ChampionIcon id={id} size={26} />
          </a>
        ))}
      </span>
    </div>
  )
}

function ScoreSide({ side }: { side: Side }) {
  return (
    <div className={`score-side ${side.side} ${side.won ? 'won' : side.won === false ? 'lost' : ''}`}>
      <TeamMark team={side.team} size={64} />
      <TeamLink team={side.team} mark={false} />
      <span className="score-side-label">{side.side === 'blue' ? 'Blue side' : 'Red side'}</span>
      {side.won !== null && <Badge tone={side.won ? 'win' : 'loss'}>{side.won ? 'Victory' : 'Defeat'}</Badge>}
    </div>
  )
}

export function MatchDetail({ match }: { match: Match }) {
  useTitle(`${match.blue.team.name} vs ${match.red.team.name}`)
  const { blue, red } = match
  const stat = (side: Side, key: 'kills' | 'towers' | 'inhibitors' | 'dragons' | 'voidGrubs' | 'riftHeralds' | 'barons') => side.stats?.[key] ?? null
  const goldOf = (side: Side) => (side.participants.length ? sum(side.participants.map((p) => p.gold)) : null)
  const damageOf = (side: Side) => (side.participants.length ? sum(side.participants.map((p) => p.damage)) : null)
  const firstBlood = blue.stats?.firstBlood ? blue : red.stats?.firstBlood ? red : null

  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <a href={paths.season(match.seasonKey, 'matches')}>Matches</a>
        <span aria-hidden="true">/</span>
        <span>{roundLabel(match.round)}</span>
      </nav>

      <header className="scoreboard">
        <ScoreSide side={blue} />
        <div className="scoreboard-center">
          {match.forfeit ? (
            <span className="scoreboard-score">FF</span>
          ) : (
            <span className="scoreboard-score">
              <span className={match.winner === blue ? 'lead' : ''}>{stat(blue, 'kills') ?? '—'}</span>
              <span className="match-score-divider" aria-label="to">–</span>
              <span className={match.winner === red ? 'lead' : ''}>{stat(red, 'kills') ?? '—'}</span>
            </span>
          )}
          <span className="eyebrow">{roundLabel(match.round)}</span>
          <span className="muted small">
            {match.forfeit ? 'Forfeit' : match.duration ? formatDuration(match.duration) : match.winner ? 'No game data' : 'Not played yet'}
            {match.startTime && ` · ${formatDate(match.startTime)}`}
          </span>
        </div>
        <ScoreSide side={red} />
      </header>

      {match.forfeit ? (
        <EmptyState title="Forfeit">
          {match.winner ? `${match.winner.team.name} won by forfeit, so there are no game stats.` : 'This match was forfeited.'}
        </EmptyState>
      ) : !match.hasData ? (
        <EmptyState title={match.winner ? 'No game data' : 'Not played yet'}>
          {match.winner ? 'The result is recorded, but stats for this game haven’t been added.' : 'Check back after the match is played.'}
        </EmptyState>
      ) : (
        <>
          <div className="match-overview">
            <Panel title="Objectives">
              <div className="split-list">
                <SplitBar label="Kills" blue={stat(blue, 'kills')} red={stat(red, 'kills')} />
                <SplitBar label="Gold" blue={goldOf(blue)} red={goldOf(red)} format={formatCompact} />
                <SplitBar label="Damage" blue={damageOf(blue)} red={damageOf(red)} format={formatCompact} />
                <SplitBar label="Towers" blue={stat(blue, 'towers')} red={stat(red, 'towers')} />
                <SplitBar label="Inhibitors" blue={stat(blue, 'inhibitors')} red={stat(red, 'inhibitors')} />
                <SplitBar label="Dragons" blue={stat(blue, 'dragons')} red={stat(red, 'dragons')} />
                <SplitBar label="Void grubs" blue={stat(blue, 'voidGrubs')} red={stat(red, 'voidGrubs')} />
                <SplitBar label="Rift heralds" blue={stat(blue, 'riftHeralds')} red={stat(red, 'riftHeralds')} />
                <SplitBar label="Barons" blue={stat(blue, 'barons')} red={stat(red, 'barons')} />
              </div>
              {firstBlood && <p className="muted small panel-note">First blood: {firstBlood.team.name}</p>}
            </Panel>
            <Panel title="Draft">
              <Bans side={blue} season={match.seasonKey} />
              <Bans side={red} season={match.seasonKey} />
            </Panel>
          </div>

          {[blue, red].map((side) => (
            <section key={side.side} className={`side-table ${side.side}`}>
              <div className="section-head">
                <h2>
                  <span className={`side-dot ${side.side}`} aria-hidden="true" />
                  {side.team.name}
                  {side.won !== null && <Badge tone={side.won ? 'win' : 'loss'}>{side.won ? 'Win' : 'Loss'}</Badge>}
                </h2>
              </div>
              <DataTable
                caption={`${side.team.name} players`}
                rows={side.participants}
                columns={participantColumns(match, side)}
                rowKey={(p) => p.player.puuid}
                empty="No player stats recorded for this side."
              />
            </section>
          ))}
        </>
      )}
    </>
  )
}
