import { useMemo, useSyncExternalStore } from 'react'

/**
 * Hash routing (`/#/seasons/2/teams`): GitHub Pages has no SPA rewrites, so
 * hash URLs are the only ones that survive a refresh or a shared link.
 */

export const SEASON_VIEWS = ['overview', 'standings', 'matches', 'teams', 'players', 'champions', 'records'] as const
export type SeasonView = (typeof SEASON_VIEWS)[number]

const DETAIL_PAGES = { matches: 'match', teams: 'team', players: 'player', champions: 'champion' } as const
type DetailPage = (typeof DETAIL_PAGES)[keyof typeof DETAIL_PAGES]

export type Route =
  | { page: 'home' }
  | { page: 'season'; season: string; view: SeasonView }
  | { page: DetailPage; season: string; id: string }
  | { page: 'notFound' }

export function parseRoute(hash: string): Route {
  const parts = hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part)
      } catch {
        return part
      }
    })
  if (parts.length === 0) return { page: 'home' }
  if (parts[0] !== 'seasons' || !parts[1]) return { page: 'notFound' }
  const [, season, view = 'overview', id, ...rest] = parts
  if (rest.length > 0 || !(SEASON_VIEWS as readonly string[]).includes(view)) return { page: 'notFound' }
  if (id === undefined) return { page: 'season', season, view: view as SeasonView }
  const page = DETAIL_PAGES[view as keyof typeof DETAIL_PAGES]
  return page ? { page, season, id } : { page: 'notFound' }
}

const segment = encodeURIComponent

export const paths = {
  home: () => '#/',
  season: (season: string, view: SeasonView = 'overview') =>
    view === 'overview' ? `#/seasons/${segment(season)}` : `#/seasons/${segment(season)}/${view}`,
  match: (season: string, id: string) => `#/seasons/${segment(season)}/matches/${segment(id)}`,
  team: (season: string, id: string) => `#/seasons/${segment(season)}/teams/${segment(id)}`,
  player: (season: string, id: string) => `#/seasons/${segment(season)}/players/${segment(id)}`,
  champion: (season: string, id: number | string) => `#/seasons/${segment(season)}/champions/${segment(String(id))}`,
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return useMemo(() => parseRoute(hash), [hash])
}

export function navigate(href: string) {
  window.location.hash = href.replace(/^#/, '')
}
