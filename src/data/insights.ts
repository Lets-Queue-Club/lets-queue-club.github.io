import { average, type Season } from './model.ts'

export interface Ranked<T> {
  item: T
  value: number
}

/** The top `count` items by `value`, skipping unknown values. */
export function top<T>(items: T[], value: (item: T) => number | null, count = 5, ascending = false): Ranked<T>[] {
  return items
    .map((item) => ({ item, value: value(item) }))
    .filter((entry): entry is Ranked<T> => entry.value !== null && Number.isFinite(entry.value))
    .sort((a, b) => (ascending ? a.value - b.value : b.value - a.value))
    .slice(0, count)
}

export interface RoundStats {
  round: number | null
  matches: number
  played: number
  killsPerGame: number | null
  averageDuration: number | null
  blueWins: number
}

export function roundStats(season: Season): RoundStats[] {
  return season.rounds.map(({ round, matches }) => {
    const played = matches.filter((match) => match.hasData && !match.forfeit)
    const kills = played
      .map((match) => (match.blue.stats?.kills ?? NaN) + (match.red.stats?.kills ?? NaN))
      .filter(Number.isFinite)
    const durations = played.map((match) => match.duration).filter((value): value is number => value !== null)
    return {
      round,
      matches: matches.length,
      played: played.length,
      killsPerGame: average({ sum: kills.reduce((sum, value) => sum + value, 0), count: kills.length }),
      averageDuration: average({ sum: durations.reduce((sum, value) => sum + value, 0), count: durations.length }),
      blueWins: played.filter((match) => match.winner === match.blue).length,
    }
  })
}

/** Minimum games for rate-based leaderboards, scaled to the season's length. */
export function qualifyingGames(season: Season): number {
  const roundCount = season.rounds.filter((round) => round.round !== null).length
  return Math.max(1, Math.min(5, Math.ceil(roundCount / 2)))
}
