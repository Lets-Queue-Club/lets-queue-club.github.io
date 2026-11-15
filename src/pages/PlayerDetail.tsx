import { BarList, FormDots } from '../components/Charts.tsx'
import { DataTable, type Column } from '../components/DataTable.tsx'
import { ChampionIcon, ChampionLink, TeamLink } from '../components/Entities.tsx'
import { PageHeader, Panel, Section, StatGrid, StatTile } from '../components/Layout.tsx'
import { useData } from '../data/context.ts'
import { average, type ChampionUsage, type Participant, type PlayerSeason, type Season } from '../data/model.ts'
import { formatCompact, formatDuration, formatNumber, formatPercent, formatRecord, plural, positionLabel, roundLabel } from '../format.ts'
import { useTitle } from '../hooks.ts'
import { paths } from '../router.ts'

export function PlayerDetail({ season, entry }: { season: Season; entry: PlayerSeason }) {
  const { league } = useData()
  const { player } = entry
  useTitle(player.name)
  const otherSeasons = league?.playerSeasons(player.puuid).filter((other) => other.seasonKey !== season.key) ?? []
  const form = entry.participations.filter((p) => p.won !== null).map((p) => (p.won ? 'W' : 'L') as 'W' | 'L')

  const championColumns: Column<ChampionUsage>[] = [
    { key: 'champion', label: 'Champion', render: (usage) => <ChampionLink season={season.key} id={usage.championId} />, sort: (usage) => league?.championName(usage.championId) ?? null, className: 'col-primary' },
    { key: 'games', label: 'GP', align: 'end', render: (usage) => usage.games, sort: (usage) => usage.games },
    { key: 'record', label: 'W–L', align: 'end', render: (usage) => formatRecord(usage.wins, usage.games - usage.wins), sort: (usage) => usage.wins / usage.games },
    {
      key: 'kda-line',
      label: 'K / D / A',
      align: 'end',
      render: (usage) => `${formatNumber(average(usage.kills), 1)} / ${formatNumber(average(usage.deaths), 1)} / ${formatNumber(average(usage.assists), 1)}`,
    },
    { key: 'kda', label: 'KDA', align: 'end', render: (usage) => formatNumber(usage.kda, 2), sort: (usage) => usage.kda },
  ]

  const gameColumns: Column<Participant>[] = [
    { key: 'round', label: 'Week', render: (p) => roundLabel(p.match.round), sort: (p) => p.match.round },
    {
      key: 'result',
      label: 'Result',
      render: (p) => (p.won === null ? '—' : <span className={p.won ? 'text-win' : 'text-loss'}>{p.won ? 'Win' : 'Loss'}</span>),
      sort: (p) => (p.won === null ? null : Number(p.won)),
    },
    { key: 'champion', label: 'Champion', render: (p) => <ChampionLink season={season.key} id={p.championId} size={26} />, sort: (p) => p.championId },
    { key: 'role', label: 'Role', render: (p) => positionLabel(p.position), sort: (p) => p.position },
    { key: 'opponent', label: 'Opponent', render: (p) => <TeamLink team={p.side.opponent.team} />, sort: (p) => p.side.opponent.team.name },
    { key: 'kda', label: 'K / D / A', align: 'center', render: (p) => `${p.kills ?? '—'} / ${p.deaths ?? '—'} / ${p.assists ?? '—'}` },
    { key: 'cs', label: 'CS', align: 'end', render: (p) => formatNumber(p.cs), sort: (p) => p.cs },
    { key: 'damage', label: 'Damage', align: 'end', render: (p) => formatCompact(p.damage), sort: (p) => p.damage },
    { key: 'gold', label: 'Gold', align: 'end', render: (p) => formatCompact(p.gold), sort: (p) => p.gold },
    { key: 'duration', label: 'Length', align: 'end', render: (p) => formatDuration(p.match.duration), sort: (p) => p.match.duration },
    { key: 'link', label: <span className="visually-hidden">Match</span>, render: (p) => <a className="text-link" href={paths.match(p.match.seasonKey, p.match.id)}>Match →</a> },
  ]

  const signature = entry.champions[0]

  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <a href={paths.season(season.key, 'players')}>Players</a>
        <span aria-hidden="true">/</span>
        <span>{player.name}</span>
      </nav>
      <PageHeader
        eyebrow={`${season.label} · ${positionLabel(entry.mainPosition)}`}
        title={<>{player.name}{player.tagline && <span className="tagline">#{player.tagline}</span>}</>}
        media={signature ? <ChampionIcon id={signature.championId} size={72} className="header-icon" /> : undefined}
        aside={<FormDots form={form} limit={8} />}
      >
        {entry.teams.map((team, index) => (
          <span key={team.id}>
            {index > 0 && ' · '}
            <TeamLink team={team} />
          </span>
        ))}
      </PageHeader>

      {entry.games === 0 ? (
        <p className="muted">Rostered this season, but no games recorded yet.</p>
      ) : (
        <>
          <StatGrid>
            <StatTile label="Record" value={formatRecord(entry.wins, entry.losses)} detail={`${formatPercent(entry.winRate)} win rate`} highlight />
            <StatTile label="KDA" value={formatNumber(entry.kda, 2)} detail={`${formatNumber(average(entry.kills), 1)} / ${formatNumber(average(entry.deaths), 1)} / ${formatNumber(average(entry.assists), 1)}`} />
            <StatTile label="Kill participation" value={formatPercent(entry.killParticipation)} />
            <StatTile label="CS / min" value={formatNumber(entry.csPerMin, 1)} detail={`${formatNumber(average(entry.cs))} per game`} />
            <StatTile label="Damage / min" value={formatNumber(entry.damagePerMin)} detail={`${formatCompact(average(entry.damage))} per game`} />
            <StatTile label="Gold / min" value={formatNumber(entry.goldPerMin)} detail={`${formatCompact(average(entry.gold))} per game`} />
          </StatGrid>

          <div className="dashboard">
            <Panel title="Champion pool" className="span-2">
              <DataTable rows={entry.champions} columns={championColumns} rowKey={(usage) => String(usage.championId)} initialSort={{ key: 'games', descending: true }} />
            </Panel>
            <Panel title="Roles">
              <BarList
                items={entry.positions.map((usage) => ({
                  key: usage.key,
                  label: positionLabel(usage.key),
                  value: usage.games,
                  note: formatRecord(usage.wins, usage.games - usage.wins),
                }))}
              />
            </Panel>
          </div>

          <Section title="Games" action={<span className="muted small">{plural(entry.participations.length, 'game')}</span>}>
            <DataTable rows={entry.participations} columns={gameColumns} rowKey={(p) => p.match.id} />
          </Section>
        </>
      )}

      {otherSeasons.length > 0 && (
        <Section title="Other seasons">
          <div className="season-grid">
            {otherSeasons.map((other) => {
              const label = league?.season(other.seasonKey)?.label ?? other.seasonKey
              return (
                <a key={other.seasonKey} className="season-card" href={paths.player(other.seasonKey, player.puuid)}>
                  <span className="season-card-body">
                    <span className="season-card-title">{label}</span>
                    <span className="muted small">
                      {other.primaryTeam?.name ?? 'No team'} · {plural(other.games, 'game')} · {formatRecord(other.wins, other.losses)}
                    </span>
                  </span>
                </a>
              )
            })}
          </div>
        </Section>
      )}
    </>
  )
}
