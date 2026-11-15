import { ChampionIcon, PlayerLink, TeamLink } from './components/Entities.tsx'
import { WinRateBar } from './components/Charts.tsx'
import type { Column } from './components/DataTable.tsx'
import { average, type ParticipantTotals, type Player, type Team } from './data/model.ts'
import { formatNumber, formatPercent, formatRecord, positionLabel } from './format.ts'
import { paths } from './router.ts'

export interface PlayerRow extends ParticipantTotals {
  player: Player
  primaryTeam?: Team | null
}

const kdaLine = (row: ParticipantTotals) =>
  row.kills.count
    ? `${formatNumber(average(row.kills), 1)} / ${formatNumber(average(row.deaths), 1)} / ${formatNumber(average(row.assists), 1)}`
    : '—'

/** Standard player stat columns, shared by every player table. */
export function playerColumns(season: string, { team = true, position = true } = {}): Column<PlayerRow>[] {
  const columns: Column<PlayerRow>[] = [
    {
      key: 'player',
      label: 'Player',
      render: (row) => <PlayerLink season={season} player={row.player} showTag />,
      sort: (row) => row.player.name.toLowerCase(),
      className: 'col-primary',
    },
  ]
  if (team) {
    columns.push({
      key: 'team',
      label: 'Team',
      render: (row) => (row.primaryTeam ? <TeamLink team={row.primaryTeam} size={22} /> : '—'),
      sort: (row) => row.primaryTeam?.name ?? null,
    })
  }
  if (position) {
    columns.push({ key: 'position', label: 'Role', render: (row) => positionLabel(row.mainPosition), sort: (row) => row.mainPosition })
  }
  columns.push(
    { key: 'games', label: 'GP', title: 'Games played', align: 'end', render: (row) => row.games, sort: (row) => row.games },
    {
      key: 'record',
      label: 'W–L',
      align: 'end',
      render: (row) => formatRecord(row.wins, row.losses),
      sort: (row) => row.wins - row.losses,
    },
    {
      key: 'winRate',
      label: 'Win rate',
      render: (row) => (row.wins + row.losses ? <WinRateBar wins={row.wins} losses={row.losses} /> : '—'),
      sort: (row) => row.winRate,
      descending: true,
    },
    { key: 'kda-line', label: 'K / D / A', title: 'Average kills, deaths and assists per game', align: 'end', render: kdaLine },
    { key: 'kda', label: 'KDA', title: '(Kills + Assists) ÷ Deaths', align: 'end', render: (row) => formatNumber(row.kda, 2), sort: (row) => row.kda },
    { key: 'kp', label: 'KP', title: 'Kill participation: share of team kills with a kill or assist', align: 'end', render: (row) => formatPercent(row.killParticipation), sort: (row) => row.killParticipation },
    { key: 'cspm', label: 'CS/m', title: 'Creep score per minute', align: 'end', render: (row) => formatNumber(row.csPerMin, 1), sort: (row) => row.csPerMin },
    { key: 'dpm', label: 'DMG/m', title: 'Damage to champions per minute', align: 'end', render: (row) => formatNumber(row.damagePerMin), sort: (row) => row.damagePerMin },
    { key: 'gpm', label: 'Gold/m', title: 'Gold earned per minute', align: 'end', render: (row) => formatNumber(row.goldPerMin), sort: (row) => row.goldPerMin },
    {
      key: 'champions',
      label: 'Champions',
      render: (row) => (
        <span className="icon-row">
          {row.champions.slice(0, 3).map((usage) => (
            <a key={usage.championId} href={paths.champion(season, usage.championId)} title={`${usage.games} games`}>
              <ChampionIcon id={usage.championId} size={24} />
            </a>
          ))}
          {row.champions.length > 3 && <span className="muted small">+{row.champions.length - 3}</span>}
        </span>
      ),
      sort: (row) => row.champions.length,
      descending: true,
    },
  )
  return columns
}
