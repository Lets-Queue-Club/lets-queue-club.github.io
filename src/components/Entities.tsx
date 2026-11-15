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

function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s&]/gu, '').split(/\s+/).filter((word) => word && word !== '&')
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function hash(text: string): number {
  let value = 0
  for (const character of text) value = (value * 31 + character.charCodeAt(0)) >>> 0
  return value
}

export function TeamMark({ team, size = 36 }: { team: Team; size?: number }) {
  return (
    <span
      className={`team-mark tone-${hash(team.id) % 5}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {initials(team.name)}
    </span>
  )
}

export function TeamLink({ team, mark = true, size = 28, children }: { team: Team; mark?: boolean; size?: number; children?: ReactNode }) {
  return (
    <a className="entity" href={paths.team(team.seasonKey, team.id)}>
      {mark && <TeamMark team={team} size={size} />}
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
