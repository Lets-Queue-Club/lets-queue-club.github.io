import type { ReactNode } from 'react'
import { useChampionArt, useData } from '../data/context.ts'
import { championIconUrl } from '../data/ddragon.ts'
import type { Player, Team } from '../data/model.ts'
import { paths } from '../router.ts'

export function ChampionIcon({ id, size = 32, className = '' }: { id: number | null; size?: number; className?: string }) {
  const art = useChampionArt()
  const { league } = useData()
  const name = id === null ? 'Unknown champion' : (league?.championName(id) ?? `Champion ${id}`)
  const url = id === null ? null : championIconUrl(art, id)
  return (
    <span className={`champion-icon ${className}`} style={{ width: size, height: size }} title={name}>
      {url ? <img src={url} alt="" width={size} height={size} loading="lazy" /> : <span aria-hidden="true">{name.charAt(0)}</span>}
    </span>
  )
}

export function ChampionLink({ season, id, size = 28, showName = true }: { season: string; id: number | null; size?: number; showName?: boolean }) {
  const { league } = useData()
  if (id === null) return <span className="entity muted">Unknown</span>
  const name = league?.championName(id) ?? `Champion ${id}`
  return (
    <a className="entity" href={paths.champion(season, id)} aria-label={showName ? undefined : name}>
      <ChampionIcon id={id} size={size} />
      {showName && <span className="entity-name">{name}</span>}
    </a>
  )
}

export function TeamLink({ team, children }: { team: Team; children?: ReactNode }) {
  return (
    <a className="entity" href={paths.team(team.seasonKey, team.id)}>
      <span className="entity-name">{children ?? team.name}</span>
    </a>
  )
}

export function PlayerLink({ season, player, showTag = false }: { season: string; player: Player; showTag?: boolean }) {
  return (
    <a className="entity" href={paths.player(season, player.puuid)} title={player.riotId}>
      <span className="entity-name">
        {player.name}
        {showTag && player.tagline && <span className="tagline">#{player.tagline}</span>}
      </span>
    </a>
  )
}
