import { BarList } from '../components/Charts.tsx'
import { DataTable, type Column } from '../components/DataTable.tsx'
import { ChampionIcon, PlayerLink, TeamLink } from '../components/Entities.tsx'
import { PageHeader, Panel, Section, StatGrid, StatTile } from '../components/Layout.tsx'
import { useChampionArt } from '../data/context.ts'
import { championSplashUrl } from '../data/ddragon.ts'
import { average, type ChampionSeason, type Participant, type Season } from '../data/model.ts'
import { formatCompact, formatNumber, formatPercent, formatRecord, plural, positionLabel, roundLabel } from '../format.ts'
import { useTitle } from '../hooks.ts'
import { paths } from '../router.ts'

export function ChampionDetail({ season, champion }: { season: Season; champion: ChampionSeason }) {
  useTitle(champion.name)
  const art = useChampionArt()
  const splash = championSplashUrl(art, champion.id)
  const { totals } = champion
  const rank = season.champions.indexOf(champion) + 1

  const gameColumns: Column<Participant>[] = [
    { key: 'round', label: 'Week', render: (p) => roundLabel(p.match.round), sort: (p) => p.match.round },
    { key: 'player', label: 'Player', render: (p) => <PlayerLink season={season.key} player={p.player} />, sort: (p) => p.player.name.toLowerCase(), className: 'col-primary' },
    { key: 'team', label: 'Team', render: (p) => <TeamLink team={p.side.team} />, sort: (p) => p.side.team.name },
    { key: 'role', label: 'Role', render: (p) => positionLabel(p.position), sort: (p) => p.position },
    {
      key: 'result',
      label: 'Result',
      render: (p) => (p.won === null ? '—' : <span className={p.won ? 'text-win' : 'text-loss'}>{p.won ? 'Win' : 'Loss'}</span>),
      sort: (p) => (p.won === null ? null : Number(p.won)),
    },
    { key: 'opponent', label: 'Opponent', render: (p) => <TeamLink team={p.side.opponent.team} />, sort: (p) => p.side.opponent.team.name },
    { key: 'kda', label: 'K / D / A', align: 'center', render: (p) => `${p.kills ?? '—'} / ${p.deaths ?? '—'} / ${p.assists ?? '—'}` },
    { key: 'damage', label: 'Damage', align: 'end', render: (p) => formatCompact(p.damage), sort: (p) => p.damage },
    { key: 'link', label: <span className="visually-hidden">Match</span>, render: (p) => <a className="text-link" href={paths.match(p.match.seasonKey, p.match.id)}>Match →</a> },
  ]

  return (
    <>
      <div className={`splash ${splash ? '' : 'no-art'}`} style={splash ? { backgroundImage: `url("${splash}")` } : undefined}>
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <a href={paths.season(season.key, 'champions')}>Champions</a>
          <span aria-hidden="true">/</span>
          <span>{champion.name}</span>
        </nav>
        <PageHeader
          eyebrow={`${season.label} · #${rank} by presence`}
          title={champion.name}
          media={<ChampionIcon id={champion.id} size={72} className="header-icon" />}
        >
          {plural(champion.picks, 'pick')} · {plural(champion.bans, 'ban')} · {formatPercent(champion.presence)} presence
        </PageHeader>
      </div>

      <StatGrid>
        <StatTile label="Presence" value={formatPercent(champion.presence)} detail="Picked or banned" highlight />
        <StatTile label="Record" value={champion.picks ? formatRecord(totals.wins, totals.losses) : '—'} detail={`${formatPercent(totals.winRate)} win rate`} />
        <StatTile label="KDA" value={formatNumber(totals.kda, 2)} detail={`${formatNumber(average(totals.kills), 1)} / ${formatNumber(average(totals.deaths), 1)} / ${formatNumber(average(totals.assists), 1)}`} />
        <StatTile label="Damage / min" value={formatNumber(totals.damagePerMin)} detail={`${formatNumber(totals.csPerMin, 1)} CS / min`} />
      </StatGrid>

      {champion.picks === 0 ? (
        <p className="muted">Banned {plural(champion.bans, 'time')} but never picked this season.</p>
      ) : (
        <>
          <div className="dashboard">
            <Panel title="Players" className="span-2">
              <BarList
                items={champion.players.slice(0, 10).map((usage) => ({
                  key: usage.key,
                  label: <PlayerLink season={season.key} player={usage.player} />,
                  value: usage.games,
                  note: formatRecord(usage.wins, usage.games - usage.wins),
                }))}
              />
            </Panel>
            <Panel title="Roles">
              <BarList
                items={totals.positions.map((usage) => ({
                  key: usage.key,
                  label: positionLabel(usage.key),
                  value: usage.games,
                  note: formatRecord(usage.wins, usage.games - usage.wins),
                }))}
              />
            </Panel>
          </div>
          <Section title="Games" action={<span className="muted small">{plural(champion.participations.length, 'game')}</span>}>
            <DataTable rows={champion.participations} columns={gameColumns} rowKey={(p) => `${p.match.id}-${p.player.puuid}`} />
          </Section>
        </>
      )}
    </>
  )
}
