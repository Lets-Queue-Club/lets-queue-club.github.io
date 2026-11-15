import { useEffect, useRef, type ReactNode } from 'react'
import { EmptyState } from './components/Layout.tsx'
import { useData } from './data/context.ts'
import type { League, Season } from './data/model.ts'
import { formatTimeAgo } from './format.ts'
import { ChampionDetail } from './pages/ChampionDetail.tsx'
import { ChampionsPage } from './pages/ChampionsPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { InfoPageView } from './pages/InfoPages.tsx'
import { MatchDetail } from './pages/MatchDetail.tsx'
import { MatchesPage } from './pages/MatchesPage.tsx'
import { NotFound } from './pages/NotFound.tsx'
import { PlayerDetail } from './pages/PlayerDetail.tsx'
import { PlayersPage } from './pages/PlayersPage.tsx'
import { RecordsPage } from './pages/RecordsPage.tsx'
import { SeasonOverview } from './pages/SeasonOverview.tsx'
import { TeamDetail } from './pages/TeamDetail.tsx'
import { TeamsPage } from './pages/TeamsPage.tsx'
import { navigate, paths, useRoute, type Route, type SeasonView } from './router.ts'

const NAV: { view: SeasonView; label: string }[] = [
  { view: 'overview', label: 'Overview' },
  { view: 'matches', label: 'Matches' },
  { view: 'teams', label: 'Teams' },
  { view: 'players', label: 'Players' },
  { view: 'champions', label: 'Champions' },
  { view: 'records', label: 'Records' },
]

const DETAIL_VIEW = { match: 'matches', team: 'teams', player: 'players', champion: 'champions' } as const

/** The season view the current route belongs to, for nav highlighting. */
function activeView(route: Route): SeasonView | null {
  if (route.page === 'season') return route.view
  if (route.page in DETAIL_VIEW) return DETAIL_VIEW[route.page as keyof typeof DETAIL_VIEW]
  return null
}

/** Where to go when the season changes, keeping the reader's place where possible. */
function seasonSwitchTarget(route: Route, season: Season): string {
  switch (route.page) {
    case 'season':
      return paths.season(season.key, route.view)
    case 'player':
      return season.playerSeason(route.id) ? paths.player(season.key, route.id) : paths.season(season.key, 'players')
    case 'champion':
      return season.champion(Number(route.id)) ? paths.champion(season.key, route.id) : paths.season(season.key, 'champions')
    case 'match':
    case 'team':
      return paths.season(season.key, DETAIL_VIEW[route.page])
    default:
      return paths.season(season.key)
  }
}

function Brand() {
  return (
    <a className="brand" href={paths.home()} aria-label="Let's Queue Club home">
      <img className="brand-mark" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={36} height={36} />
      <span className="brand-text">
        Let&apos;s Queue <span>Club</span>
      </span>
    </a>
  )
}

function DataStatus() {
  const { savedAt, loading, error, refresh } = useData()
  const label = loading ? 'Updating…' : error ? 'Offline copy' : savedAt ? `Updated ${formatTimeAgo(savedAt)}` : ''
  return (
    <button
      type="button"
      className={`data-status ${loading ? 'loading' : ''} ${error ? 'error' : ''}`}
      onClick={refresh}
      disabled={loading}
      title={error ? `Couldn't reach the sheet: ${error}. Click to retry.` : 'Reload the latest data from the club sheet'}
    >
      <span className="data-status-dot" aria-hidden="true" />
      <span className="data-status-label">{label}</span>
    </button>
  )
}

function Header({ league, route, season }: { league: League | null; route: Route; season: Season | null }) {
  const view = activeView(route)
  const navRef = useRef<HTMLElement>(null)

  // On narrow screens the nav scrolls sideways; keep the current section visible.
  useEffect(() => {
    const nav = navRef.current
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return
    nav.scrollTo({ left: active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2 })
  }, [view, route.page, season])

  return (
    <header className="site-header">
      <div className="header-bar">
        <Brand />
        <div className="header-tools">
          {league && season && (
            <label className="select season-select">
              <span className="visually-hidden">Season</span>
              <select
                value={season.key}
                onChange={(event) => {
                  const next = league.season(event.target.value)
                  if (next) navigate(seasonSwitchTarget(route, next))
                }}
              >
                {league.seasons.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
              </select>
            </label>
          )}
          <DataStatus />
        </div>
      </div>
      {season && (
        <nav ref={navRef} className="site-nav" aria-label={`${season.label} sections`}>
          <a href={paths.home()} className={route.page === 'home' ? 'active' : ''} aria-current={route.page === 'home' ? 'page' : undefined}>Home</a>
          {NAV.map((item) => (
            <a
              key={item.view}
              href={paths.season(season.key, item.view)}
              className={view === item.view ? 'active' : ''}
              aria-current={view === item.view ? 'page' : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <Brand />
        <p className="muted small">Built by the club, for the love of the game. Stats come straight from the club&apos;s records.</p>
      </div>
      <nav className="footer-links" aria-label="Club policies">
        <a href={paths.info('rules')}>League Rules</a>
        <a href={paths.info('privacy')}>Privacy Policy</a>
        <a href={paths.info('terms')}>Terms of Use</a>
      </nav>
      <p className="legal">
        Let&apos;s Queue Club isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or anyone
        officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or
        registered trademarks of Riot Games, Inc.
      </p>
    </footer>
  )
}

function Loading() {
  return (
    <div className="page-loading" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>Loading club records…</span>
    </div>
  )
}

function Content({ route, league, season }: { route: Route; league: League | null; season: Season | null }) {
  const { loading, error, refresh } = useData()
  if (route.page === 'home') return <HomePage />
  if (route.page === 'info') return <InfoPageView doc={route.doc} />
  if (route.page === 'notFound') return <NotFound />
  if (!league) {
    if (loading) return <Loading />
    return (
      <EmptyState title="Couldn’t load the club records">
        <p>{error}</p>
        <button type="button" className="button primary" onClick={refresh}>Try again</button>
      </EmptyState>
    )
  }
  if (!season) return loading ? <Loading /> : <NotFound what="Season" />

  let page: ReactNode
  if (route.page === 'season') {
    const views: Record<SeasonView, () => ReactNode> = {
      overview: () => <SeasonOverview season={season} />,
      matches: () => <MatchesPage season={season} />,
      teams: () => <TeamsPage season={season} />,
      players: () => <PlayersPage season={season} />,
      champions: () => <ChampionsPage season={season} />,
      records: () => <RecordsPage season={season} />,
    }
    page = views[route.view]()
  } else if (route.page === 'match') {
    const match = season.match(route.id)
    page = match ? <MatchDetail match={match} /> : <NotFound what="Match" />
  } else if (route.page === 'team') {
    const team = season.team(route.id)
    page = team ? <TeamDetail season={season} team={team} /> : <NotFound what="Team" />
  } else if (route.page === 'player') {
    const entry = season.playerSeason(route.id)
    page = entry ? <PlayerDetail season={season} entry={entry} /> : <NotFound what="Player" />
  } else {
    const champion = season.champion(Number(route.id))
    page = champion ? <ChampionDetail season={season} champion={champion} /> : <NotFound what="Champion" />
  }
  return page
}

export default function App() {
  const route = useRoute()
  const { league } = useData()
  const mainRef = useRef<HTMLElement>(null)
  const routeSeason = 'season' in route ? (league?.season(route.season) ?? null) : null
  const season = route.page === 'home' ? (league?.latest ?? null) : routeSeason
  const navSeason = season ?? league?.latest ?? null
  const routeKey = JSON.stringify(route)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [routeKey])

  return (
    <div className="site-shell">
      <button type="button" className="skip-link" onClick={() => mainRef.current?.focus()}>
        Skip to content
      </button>
      <Header league={league} route={route} season={navSeason} />
      {/* Keyed by route so each page mounts fresh, with its own filters. */}
      <main id="main" ref={mainRef} tabIndex={-1} key={routeKey}>
        <Content route={route} league={league} season={season} />
      </main>
      <Footer />
    </div>
  )
}
