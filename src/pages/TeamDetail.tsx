import { useMemo } from 'react'
import { BarList, FormDots } from '../components/Charts.tsx'
import { DataTable } from '../components/DataTable.tsx'
import { ChampionLink, TeamLink, TeamMark } from '../components/Entities.tsx'
import { Badge, PageHeader, Panel, Section, StatGrid, StatTile } from '../components/Layout.tsx'
import { playerColumns, type PlayerRow } from '../columns.tsx'
import { average, summarizeParticipations, type Season, type Team } from '../data/model.ts'
import { formatAverage, formatDuration, formatPercent, formatRecord, formatSigned, plural, roundLabel } from '../format.ts'
import { useTitle } from '../hooks.ts'
import { paths } from '../router.ts'

export function TeamDetail({ season, team }: { season: Season; team: Team }) {
  useTitle(team.name)
  const rows = useMemo<(PlayerRow & { sub: boolean })[]>(
    () =>
      team.players.map((entry) => ({
        ...summarizeParticipations(entry.participations.filter((p) => p.side.team === team)),
        player: entry.player,
        primaryTeam: team,
        sub: team.roster.find((slot) => slot.player.puuid === entry.player.puuid)?.sub ?? true,
      })),
    [team],
  )
  const columns = playerColumns(season.key, { team: false })
  const [nameColumn] = columns
  columns[0] = {
    ...nameColumn,
    render: (row) => (
      <span className="entity-stack">
        {nameColumn.render(row)}
        {(row as PlayerRow & { sub: boolean }).sub && <Badge tone="muted">Sub</Badge>}
      </span>
    ),
  }

  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <a href={paths.season(season.key, 'teams')}>Teams</a>
        <span aria-hidden="true">/</span>
        <span>{team.name}</span>
      </nav>
      <PageHeader
        eyebrow={`${season.label} · Rank ${team.rank} of ${season.teams.length}`}
        title={team.name}
        media={<TeamMark team={team} size={72} />}
        aside={<FormDots form={team.form} limit={8} />}
      >
        {formatRecord(team.wins, team.losses)}
        {team.streak && ` · ${team.streak.result === 'W' ? 'Won' : 'Lost'} ${team.streak.count} in a row`}
      </PageHeader>

      <StatGrid>
        <StatTile label="Record" value={formatRecord(team.wins, team.losses)} detail={`${formatPercent(team.winRate)} win rate`} highlight />
        <StatTile label="Kills / game" value={formatAverage(team.kills)} detail={`${formatSigned(team.killDiff)} kill difference`} />
        <StatTile label="Average game" value={formatDuration(average(team.duration))} detail={`Blue ${formatRecord(team.blue.wins, team.blue.losses)} · Red ${formatRecord(team.red.wins, team.red.losses)}`} />
        <StatTile label="First blood" value={formatPercent(average(team.firstBloods))} detail={`${plural(team.firstBloods.sum, 'game')}`} />
        <StatTile label="Towers / game" value={formatAverage(team.towers)} detail={`${formatAverage(team.inhibitors)} inhibitors`} />
        <StatTile label="Dragons / game" value={formatAverage(team.dragons)} detail={`${formatAverage(team.voidGrubs)} grubs · ${formatAverage(team.barons)} barons`} />
      </StatGrid>

      <Section title="Roster">
        <DataTable
          caption={`${team.name} roster`}
          rows={rows}
          columns={columns}
          rowKey={(row) => row.player.puuid}
          initialSort={{ key: 'games', descending: true }}
          empty="No players on this roster."
        />
      </Section>

      <Section title="Match history">
        {team.matches.length === 0 ? (
          <p className="muted">No matches scheduled.</p>
        ) : (
          <ol className="history-list">
            {team.matches.map((match) => {
              const side = match.blue.team === team ? match.blue : match.red
              const opponent = side.opponent
              const result = side.won === null ? null : side.won
              return (
                <li key={match.id} className={result === null ? '' : result ? 'win' : 'loss'}>
                  <span className="history-round">{roundLabel(match.round)}</span>
                  <span className={`history-result ${result === null ? '' : result ? 'text-win' : 'text-loss'}`}>
                    {result === null ? '—' : result ? 'W' : 'L'}
                  </span>
                  <span className="history-opponent">
                    <span className="muted small">{side.side === 'blue' ? 'vs' : '@'}</span> <TeamLink team={opponent.team} size={24} />
                  </span>
                  <span className="history-score">
                    {match.forfeit ? 'Forfeit' : side.stats?.kills != null && opponent.stats?.kills != null ? `${side.stats.kills} – ${opponent.stats.kills}` : '—'}
                  </span>
                  <span className="history-duration muted">{match.duration ? formatDuration(match.duration) : ''}</span>
                  <a className="text-link" href={paths.match(match.seasonKey, match.id)}>Details →</a>
                </li>
              )
            })}
          </ol>
        )}
      </Section>

      <div className="dashboard">
        <Panel title="Most picked">
          <BarList
            items={team.picks.slice(0, 8).map((usage) => ({
              key: String(usage.championId),
              label: <ChampionLink season={season.key} id={usage.championId} size={24} />,
              value: usage.games,
              note: formatRecord(usage.wins, usage.games - usage.wins),
            }))}
          />
        </Panel>
        <Panel title="Bans by team">
          <BarList
            items={team.bansBy.slice(0, 8).map((usage) => ({
              key: usage.key,
              label: <ChampionLink season={season.key} id={Number(usage.key)} size={24} />,
              value: usage.games,
            }))}
          />
        </Panel>
        <Panel title="Banned against">
          <BarList
            items={team.bansAgainst.slice(0, 8).map((usage) => ({
              key: usage.key,
              label: <ChampionLink season={season.key} id={Number(usage.key)} size={24} />,
              value: usage.games,
            }))}
          />
        </Panel>
      </div>
    </>
  )
}
