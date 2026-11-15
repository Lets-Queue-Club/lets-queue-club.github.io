import { useState } from 'react'
import { CLUB, daysUntil, parseClubDate, upcomingEvents } from '../club.ts'
import { Section } from '../components/Layout.tsx'
import { useData } from '../data/context.ts'
import { formatDate, formatNumber, formatRecord, plural } from '../format.ts'
import { useTitle } from '../hooks.ts'
import { paths } from '../router.ts'

const ABOUT = [
  { title: 'Seasonal tournaments', body: 'Teams of five play a weekly tournament-code match through each season.' },
  { title: 'Every rank welcome', body: 'New and veteran players alike: it\u2019s about playing together, not just climbing.' },
  { title: 'Every game tracked', body: 'Results, box scores, and leaderboards for every season, all in one place.' },
]

export function HomePage() {
  const { league, loading, error } = useData()
  useTitle(null)
  const [now] = useState(() => Date.now())
  const latest = league?.latest ?? null
  const leader = latest?.teams.find((team) => team.rank === 1 && team.games > 0) ?? null
  const days = daysUntil(CLUB.nextSeason.start, now)
  const startDate = CLUB.nextSeason.start ? parseClubDate(CLUB.nextSeason.start) : null
  const events = upcomingEvents(CLUB.events, now)

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Community League of Legends</p>
          <h1 className="hero-title">
            Good games.<br />Great company.<br /><span className="gold-text">Let&apos;s queue.</span>
          </h1>
          <p className="hero-lede">
            Let&apos;s Queue Club is a community League of Legends league. Form a team, play a season of weekly matches, and
            see how you stack up.
          </p>
          <div className="hero-actions">
            {CLUB.signupUrl ? (
              <a className="button primary" href={CLUB.signupUrl} target="_blank" rel="noreferrer">
                Sign up for {CLUB.nextSeason.label} <span aria-hidden="true">→</span>
              </a>
            ) : (
              <span className="button primary disabled" aria-disabled="true">Signups open soon</span>
            )}
            {latest && <a className="button" href={paths.season(latest.key)}>{latest.label} stats</a>}
          </div>
        </div>

        <div className="countdown">
          <span className="eyebrow">{CLUB.nextSeason.label}</span>
          {days === null ? (
            <>
              <span className="countdown-value">TBA</span>
              <span className="countdown-label">Start date to be announced</span>
            </>
          ) : (
            <>
              <span className="countdown-value">{days === 0 ? 'Today' : formatNumber(days)}</span>
              <span className="countdown-label">
                {days === 0 ? 'The season starts today' : `${days === 1 ? 'day' : 'days'} until kickoff`}
              </span>
            </>
          )}
          {startDate && days !== null && <span className="muted small">Starts {formatDate(startDate)}</span>}
        </div>
      </section>

      <Section title="Coming up">
        {events.length === 0 ? (
          <div className="event-empty">
            <p>No events scheduled yet. Check back soon for signups, drafts, and match days.</p>
          </div>
        ) : (
          <ul className="event-list">
            {events.map((event) => {
              const date = parseClubDate(event.date)
              return (
                <li key={`${event.date}-${event.title}`} className="event">
                  <span className="event-date">
                    <span className="event-month">{date?.toLocaleDateString('en-US', { month: 'short' })}</span>
                    <span className="event-day">{date?.getDate()}</span>
                  </span>
                  <span className="event-body">
                    <span className="event-title">
                      {event.url ? <a className="text-link" href={event.url} target="_blank" rel="noreferrer">{event.title}</a> : event.title}
                    </span>
                    {event.description && <span className="muted small">{event.description}</span>}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <Section title="About the club">
        <div className="about-grid">
          {ABOUT.map((item) => (
            <div key={item.title} className="about-card">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Latest season">
        {latest ? (
          <a className="latest-season" href={paths.season(latest.key)}>
            <span className="season-number">{latest.number ?? '?'}</span>
            <span className="latest-season-body">
              <span className="latest-season-title">{latest.label}</span>
              <span className="muted small">
                {plural(latest.teams.length, 'team')} · {plural(latest.matches.length, 'match', 'matches')} · {plural(latest.rounds.length, 'week')}
              </span>
              {leader && (
                <span className="latest-season-leader">
                  First place: <strong>{leader.name}</strong> ({formatRecord(leader.wins, leader.losses)})
                </span>
              )}
            </span>
            <span className="latest-season-cta">Explore <span aria-hidden="true">→</span></span>
          </a>
        ) : (
          <p className="muted">{error && !loading ? `Season data couldn't be loaded. ${error}` : 'Loading seasons…'}</p>
        )}
        {league && league.seasons.length > 1 && (
          <p className="season-archive">
            Archive:{' '}
            {league.seasons
              .filter((season) => season !== latest)
              .map((season, index) => (
                <span key={season.key}>
                  {index > 0 && ' · '}
                  <a className="text-link" href={paths.season(season.key)}>{season.label}</a>
                </span>
              ))}
          </p>
        )}
      </Section>
    </div>
  )
}
