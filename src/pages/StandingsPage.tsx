import { FormDots, WinRateBar } from '../components/Charts.tsx'
import { DataTable, type Column } from '../components/DataTable.tsx'
import { TeamLink } from '../components/Entities.tsx'
import { PageHeader } from '../components/Layout.tsx'
import { average, type Season, type Team } from '../data/model.ts'
import { formatAverage, formatDuration, formatRecord, formatSigned, plural } from '../format.ts'
import { useTitle } from '../hooks.ts'

export function StandingsPage({ season }: { season: Season }) {
  useTitle(`${season.label} standings`)
  const columns: Column<Team>[] = [
    { key: 'rank', label: 'Rank', align: 'end', render: (team) => <span className="rank">{team.rank}</span>, sort: (team) => team.rank, className: 'col-rank' },
    { key: 'team', label: 'Team', render: (team) => <TeamLink team={team} />, sort: (team) => team.name.toLowerCase(), className: 'col-primary' },
    { key: 'record', label: 'W–L', align: 'end', render: (team) => <strong>{formatRecord(team.wins, team.losses)}</strong>, sort: (team) => team.wins - team.losses },
    { key: 'winRate', label: 'Win rate', render: (team) => <WinRateBar wins={team.wins} losses={team.losses} />, sort: (team) => team.winRate, descending: true },
    { key: 'form', label: 'Last 5', render: (team) => <FormDots form={team.form} /> },
    {
      key: 'streak',
      label: 'Streak',
      align: 'end',
      render: (team) => (team.streak ? <span className={team.streak.result === 'W' ? 'text-win' : 'text-loss'}>{team.streak.result}{team.streak.count}</span> : '—'),
      sort: (team) => (team.streak ? (team.streak.result === 'W' ? team.streak.count : -team.streak.count) : null),
    },
    { key: 'kills', label: 'K/G', title: 'Kills per game', align: 'end', render: (team) => formatAverage(team.kills), sort: (team) => average(team.kills) },
    { key: 'deaths', label: 'D/G', title: 'Deaths (kills against) per game', align: 'end', render: (team) => formatAverage(team.deaths), sort: (team) => average(team.deaths) },
    {
      key: 'diff',
      label: 'Diff',
      title: 'Total kill difference',
      align: 'end',
      render: (team) => <span className={team.killDiff > 0 ? 'text-win' : team.killDiff < 0 ? 'text-loss' : ''}>{formatSigned(team.killDiff)}</span>,
      sort: (team) => team.killDiff,
    },
    { key: 'towers', label: 'Towers', title: 'Towers per game', align: 'end', render: (team) => formatAverage(team.towers), sort: (team) => average(team.towers) },
    { key: 'dragons', label: 'Drakes', title: 'Dragons per game', align: 'end', render: (team) => formatAverage(team.dragons), sort: (team) => average(team.dragons) },
    { key: 'grubs', label: 'Grubs', title: 'Void grubs per game', align: 'end', render: (team) => formatAverage(team.voidGrubs), sort: (team) => average(team.voidGrubs) },
    { key: 'barons', label: 'Barons', title: 'Barons per game', align: 'end', render: (team) => formatAverage(team.barons), sort: (team) => average(team.barons) },
    { key: 'duration', label: 'Avg time', align: 'end', render: (team) => formatDuration(average(team.duration)), sort: (team) => average(team.duration) },
    { key: 'blue', label: 'Blue', title: 'Record on blue side', align: 'end', render: (team) => formatRecord(team.blue.wins, team.blue.losses), sort: (team) => team.blue.wins - team.blue.losses },
    { key: 'red', label: 'Red', title: 'Record on red side', align: 'end', render: (team) => formatRecord(team.red.wins, team.red.losses), sort: (team) => team.red.wins - team.red.losses },
    {
      key: 'forfeits',
      label: 'FF',
      title: 'Forfeit wins–losses (included in the record)',
      align: 'end',
      render: (team) => (team.forfeitWins || team.forfeitLosses ? formatRecord(team.forfeitWins, team.forfeitLosses) : '—'),
      sort: (team) => team.forfeitWins + team.forfeitLosses,
    },
  ]

  return (
    <>
      <PageHeader eyebrow={season.label} title="Standings">
        Ranked by wins, then losses, then kill difference · {plural(season.summary.decided, 'result')}
      </PageHeader>
      <DataTable
        caption={`${season.label} standings`}
        rows={season.teams}
        columns={columns}
        rowKey={(team) => team.id}
        rowClassName={(team) => (team.rank <= 1 && team.games ? 'row-leader' : undefined)}
        empty="No teams this season yet."
      />
    </>
  )
}
