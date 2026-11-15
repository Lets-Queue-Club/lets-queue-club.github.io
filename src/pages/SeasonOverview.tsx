import { useState } from 'react'
import { BarList, ColumnChart, FormDots, Ring } from '../components/Charts.tsx'
import { ChampionLink, PlayerLink, TeamLink } from '../components/Entities.tsx'
import { PageHeader, Panel, Segmented, StatGrid, StatTile } from '../components/Layout.tsx'
import { qualifyingGames, roundStats, top } from '../data/insights.ts'
import { average, type Season } from '../data/model.ts'
import { formatDuration, formatNumber, formatPercent, formatRecord, plural, roundLabel, ROUND_LABEL } from '../format.ts'
import { useTitle } from '../hooks.ts'
import { paths } from '../router.ts'

type RoundMetric = 'kills' | 'duration' | 'games'

export function SeasonOverview({ season }: { season: Season }) {
  useTitle(season.label)
  const [metric, setMetric] = useState<RoundMetric>('kills')
  const { summary } = season
  const rounds = roundStats(season)
  const minimum = qualifyingGames(season)
  const qualified = season.players.filter((player) => player.games >= minimum)
  const playedCount = season.players.filter((player) => player.games > 0).length

  const leaderBoards = [
    { title: 'KDA', items: top(qualified, (p) => p.kda, 3), format: (value: number) => formatNumber(value, 2) },
    { title: 'Kills / game', items: top(qualified, (p) => average(p.kills), 3), format: (value: number) => formatNumber(value, 1) },
    { title: 'Damage / min', items: top(qualified, (p) => p.damagePerMin, 3), format: (value: number) => formatNumber(value) },
    { title: 'CS / min', items: top(qualified, (p) => p.csPerMin, 3), format: (value: number) => formatNumber(value, 1) },
  ]

  return (
    <>
      <PageHeader eyebrow="Season overview" title={season.label}>
        {plural(season.teams.length, 'team')} · {plural(playedCount, 'player')} · {plural(season.rounds.length, ROUND_LABEL.toLowerCase())}
      </PageHeader>

      <StatGrid>
        <StatTile label="Matches played" value={formatNumber(summary.played)} detail={summary.forfeits ? `+ ${plural(summary.forfeits, 'forfeit')}` : `${plural(summary.matches, 'match', 'matches')} scheduled`} highlight />
        <StatTile label="Average game" value={formatDuration(average(summary.duration))} detail={summary.shortest && summary.longest ? `${formatDuration(summary.shortest.duration)} – ${formatDuration(summary.longest.duration)}` : undefined} />
        <StatTile label="Kills per game" value={formatNumber(average(summary.kills), 1)} detail="Both teams combined" />
        <StatTile label="Champions played" value={formatNumber(summary.uniquePicks)} detail={`${formatNumber(summary.uniqueBans)} banned`} />
      </StatGrid>

      <div className="dashboard">
        <Panel title="Standings" action={<a className="text-link" href={paths.season(season.key, 'teams')}>All teams →</a>} className="span-2">
          <ol className="mini-standings">
            {season.teams.slice(0, 8).map((team) => (
              <li key={team.id}>
                <span className="mini-rank">{team.rank}</span>
                <TeamLink team={team} />
                <FormDots form={team.form} />
                <span className="mini-record">{formatRecord(team.wins, team.losses)}</span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="Side advantage">
          <Ring
            value={summary.sideGames ? summary.blueWins / summary.sideGames : null}
            label="Blue side win rate"
            detail={`${summary.blueWins} of ${summary.sideGames} games`}
          />
          <p className="muted small panel-note">Sides follow the schedule order; they may not match the sides actually played.</p>
        </Panel>

        <Panel
          title={`By ${ROUND_LABEL.toLowerCase()}`}
          className="span-3"
          action={
            <Segmented
              label="Metric"
              value={metric}
              onChange={setMetric}
              options={[
                { value: 'kills', label: 'Kills / game' },
                { value: 'duration', label: 'Game time' },
                { value: 'games', label: 'Matches' },
              ]}
            />
          }
        >
          <ColumnChart
            label={`Season ${metric} by ${ROUND_LABEL.toLowerCase()}`}
            items={rounds.map((round) => {
              const value = metric === 'kills' ? round.killsPerGame : metric === 'duration' ? round.averageDuration : round.matches
              return {
                key: String(round.round),
                label: roundLabel(round.round).replace(`${ROUND_LABEL} `, ROUND_LABEL.charAt(0)),
                value,
                display: metric === 'duration' ? formatDuration(value) : formatNumber(value, metric === 'kills' ? 1 : 0),
              }
            })}
          />
        </Panel>

        <Panel title="Most picked" action={<a className="text-link" href={paths.season(season.key, 'champions')}>Champions →</a>}>
          <BarList
            items={[...season.champions].sort((a, b) => b.picks - a.picks).slice(0, 5).map((champion) => ({
              key: String(champion.id),
              label: <ChampionLink season={season.key} id={champion.id} size={24} />,
              value: champion.picks,
              note: `${formatPercent(champion.totals.winRate)} WR`,
            }))}
          />
        </Panel>
        <Panel title="Most banned">
          <BarList
            items={[...season.champions].sort((a, b) => b.bans - a.bans).slice(0, 5).map((champion) => ({
              key: String(champion.id),
              label: <ChampionLink season={season.key} id={champion.id} size={24} />,
              value: champion.bans,
            }))}
          />
        </Panel>
        <Panel title="Highest presence">
          <BarList
            max={1}
            items={season.champions.slice(0, 5).map((champion) => ({
              key: String(champion.id),
              label: <ChampionLink season={season.key} id={champion.id} size={24} />,
              value: champion.presence ?? 0,
              display: formatPercent(champion.presence),
            }))}
          />
        </Panel>

        <Panel title="Player leaders" className="span-3" action={<a className="text-link" href={paths.season(season.key, 'players')}>All players →</a>}>
          <div className="leader-grid">
            {leaderBoards.map((board) => (
              <div key={board.title} className="leader-board">
                <h4>{board.title}</h4>
                <ol>
                  {board.items.map(({ item, value }, index) => (
                    <li key={item.player.puuid} className={index === 0 ? 'first' : ''}>
                      <PlayerLink season={season.key} player={item.player} />
                      <span className="leader-value">{board.format(value)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          <p className="muted small panel-note">Minimum {plural(minimum, 'game')} played.</p>
        </Panel>
      </div>
    </>
  )
}
