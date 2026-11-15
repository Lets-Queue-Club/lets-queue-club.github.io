/**
 * Club details shown on the landing page. Edit these by hand until they live
 * in the spreadsheet; anything left null shows as "TBA".
 */

export interface ClubEvent {
  title: string
  /** ISO date, e.g. '2026-03-14' or '2026-03-14T19:00:00-05:00'. */
  date: string
  description?: string
  url?: string
}

export interface ClubInfo {
  nextSeason: {
    label: string
    /** ISO date the season starts; null until it's scheduled. */
    start: string | null
  }
  /** Where new players sign up; null hides the signup button. */
  signupUrl: string | null
  events: ClubEvent[]
}

export const CLUB: ClubInfo = {
  nextSeason: { label: 'Season 3', start: null },
  signupUrl: null,
  events: [],
}

const DAY = 24 * 60 * 60 * 1000

/** Parses an ISO date; date-only strings are treated as local midnight, not UTC. */
export function parseClubDate(date: string): Date | null {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const parsed = dateOnly ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])) : new Date(date)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

/** Whole days from `now` until `date` (0 on the day itself), or null if unknown or past. */
export function daysUntil(date: string | null, now: number): number | null {
  const parsed = date ? parseClubDate(date) : null
  if (!parsed) return null
  const days = Math.ceil((parsed.getTime() - now) / DAY)
  return days < 0 ? null : Math.max(0, days)
}

export function upcomingEvents(events: ClubEvent[], now: number): ClubEvent[] {
  return events
    .map((event) => ({ event, time: parseClubDate(event.date)?.getTime() ?? Number.NaN }))
    .filter(({ time }) => time + DAY > now)
    .sort((a, b) => a.time - b.time)
    .map(({ event }) => event)
}
