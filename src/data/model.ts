import type { Cell, Database, Row } from './types.ts'

/**
 * Turns the raw endpoint tables into a linked, season-grouped model.
 *
 * Seasons aren't a column yet: a team's season comes from its ID prefix
 * (`S2-T01` -> season 2), and a match belongs to its teams' season.
 * Teams without a prefix are grouped under the "other" season.
 */

export const POSITIONS = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'] as const
export const POSITION_LABELS: Record<string, string> = {
  TOP: 'Top',
  JUNGLE: 'Jungle',
  MIDDLE: 'Mid',
  BOTTOM: 'Bot',
  UTILITY: 'Support',
}
export const OTHER_SEASON = 'other'

/** A running sum over the rows where the value is known. */
export interface Total {
  sum: number
  count: number
}

export interface Player {
  puuid: string
  gameName: string
  tagline: string
  /** Game name, or a fallback when the player row is missing. */
  name: string
  /** `Game Name#Tagline`, or just the name when the tagline is unknown. */
  riotId: string
}

export interface RosterSlot {
  player: Player
  slot: string
  sub: boolean
}

export interface SideStats {
  bans: number[]
  firstBlood: boolean | null
  kills: number | null
  towers: number | null
  inhibitors: number | null
  dragons: number | null
  voidGrubs: number | null
  riftHeralds: number | null
  barons: number | null
}

export interface Side {
  side: 'blue' | 'red'
  team: Team
  won: boolean | null
  stats: SideStats | null
  participants: Participant[]
  opponent: Side
  match: Match
}

export interface Match {
  id: string
  seasonKey: string
  round: number | null
  /** Row order in the Matches table, for a stable sort within a round. */
  order: number
  blue: Side
  red: Side
  winner: Side | null
  forfeit: boolean
  /** True when any side stats or participants exist. */
  hasData: boolean
  duration: number | null
  startTime: Date | null
}

export interface Participant {
  match: Match
  side: Side
  player: Player
  championId: number | null
  position: string
  kills: number | null
  deaths: number | null
  assists: number | null
  cs: number | null
  damage: number | null
  gold: number | null
  won: boolean | null
}

export interface Usage {
  key: string
  games: number
  wins: number
}

export interface ChampionUsage extends Usage {
  championId: number
  kills: Total
  deaths: Total
  assists: Total
  kda: number | null
}

/** Aggregate stats for any set of participant rows (a player, a champion, ...). */
export interface ParticipantTotals {
  games: number
  wins: number
  losses: number
  winRate: number | null
  kills: Total
  deaths: Total
  assists: Total
  cs: Total
  damage: Total
  gold: Total
  kda: number | null
  killParticipation: number | null
  csPerMin: number | null
  damagePerMin: number | null
  goldPerMin: number | null
  champions: ChampionUsage[]
  positions: Usage[]
  mainPosition: string | null
}

export interface WinLoss {
  wins: number
  losses: number
}

export interface Team {
  id: string
  name: string
  seasonKey: string
  roster: RosterSlot[]
  matches: Match[]
  wins: number
  losses: number
  forfeitWins: number
  forfeitLosses: number
  /** Matches with a result. */
  games: number
  winRate: number | null
  rank: number
  /** Results in match order. */
  form: ('W' | 'L')[]
  streak: { result: 'W' | 'L'; count: number } | null
  blue: WinLoss
  red: WinLoss
  kills: Total
  deaths: Total
  /** Team gold per game, summed from participants. */
  gold: Total
  towers: Total
  dragons: Total
  voidGrubs: Total
  riftHeralds: Total
  barons: Total
  inhibitors: Total
  firstBloods: Total
  duration: Total
  killDiff: number
  picks: ChampionUsage[]
  bansBy: Usage[]
  bansAgainst: Usage[]
  players: PlayerSeason[]
}

export interface PlayerSeason extends ParticipantTotals {
  player: Player
  seasonKey: string
  teams: Team[]
  primaryTeam: Team | null
  participations: Participant[]
}

export interface ChampionSeason {
  id: number
  name: string
  picks: number
  bans: number
  /** Share of played games where the champion was picked or banned. */
  presence: number | null
  totals: ParticipantTotals
  players: (Usage & { player: Player })[]
  participations: Participant[]
}

export interface Round {
  round: number | null
  matches: Match[]
}

export interface SeasonSummary {
  matches: number
  played: number
  forfeits: number
  decided: number
  pending: number
  /** Combined kills per game, where both teams' kills are known. */
  kills: Total
  duration: Total
  longest: Match | null
  shortest: Match | null
  blueWins: number
  sideGames: number
  uniquePicks: number
  uniqueBans: number
}

export interface Season {
  key: string
  number: number | null
  label: string
  teams: Team[]
  matches: Match[]
  rounds: Round[]
  players: PlayerSeason[]
  champions: ChampionSeason[]
  participants: Participant[]
  summary: SeasonSummary
  team: (id: string) => Team | undefined
  match: (id: string) => Match | undefined
  playerSeason: (puuid: string) => PlayerSeason | undefined
  champion: (id: number) => ChampionSeason | undefined
}

export interface League {
  /** Newest first; the "other" season, if any, is last. */
  seasons: Season[]
  latest: Season | null
  season: (key: string) => Season | undefined
  championName: (id: number) => string
  /** Every season a player appears in, newest first. */
  playerSeasons: (puuid: string) => PlayerSeason[]
  /** Rows that couldn't be linked; useful when debugging the sheet. */
  issues: string[]
}

export const newTotal = (): Total => ({ sum: 0, count: 0 })
export const average = (total: Total): number | null => (total.count ? total.sum / total.count : null)
const ratio = (top: number, bottom: number): number | null => (bottom > 0 ? top / bottom : null)

function addTo(total: Total, value: number | null) {
  if (value !== null) {
    total.sum += value
    total.count += 1
  }
}

export function toNumber(value: Cell): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function toText(value: Cell): string {
  return value === null || value === undefined ? '' : String(value).trim()
}

function toBoolean(value: Cell): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const text = toText(value).toLowerCase()
  if (['true', 'yes', 'y', '1'].includes(text)) return true
  if (['false', 'no', 'n', '0'].includes(text)) return false
  return null
}

/** Accepts epoch milliseconds or seconds (Riot), a Sheets date serial, or a date string. */
export function toDate(value: Cell): Date | null {
  const number = toNumber(value)
  let time: number
  if (number !== null) {
    if (number > 1e11) time = number
    else if (number > 1e9) time = number * 1000
    else time = Math.round((number - 25569) * 86400000)
  } else {
    const text = toText(value)
    if (!text) return null
    time = Date.parse(text)
  }
  return Number.isNaN(time) ? null : new Date(time)
}

export function seasonKeyOf(teamId: string): string {
  const match = /^S(\d+)[-_]/i.exec(teamId)
  return match ? String(Number(match[1])) : OTHER_SEASON
}

function countBy<T>(items: T[], keyOf: (item: T) => string | null, wonOf?: (item: T) => boolean | null): Usage[] {
  const usage = new Map<string, Usage>()
  for (const item of items) {
    const key = keyOf(item)
    if (key === null) continue
    const entry = usage.get(key) ?? { key, games: 0, wins: 0 }
    entry.games += 1
    if (wonOf?.(item)) entry.wins += 1
    usage.set(key, entry)
  }
  return [...usage.values()].sort((a, b) => b.games - a.games || b.wins - a.wins || a.key.localeCompare(b.key))
}

export function summarizeParticipations(participations: Participant[]): ParticipantTotals {
  const totals = {
    kills: newTotal(),
    deaths: newTotal(),
    assists: newTotal(),
    cs: newTotal(),
    damage: newTotal(),
    gold: newTotal(),
  }
  const perMinute = { cs: newTotal(), damage: newTotal(), gold: newTotal() }
  let wins = 0
  let losses = 0
  let kdaTop = 0
  let kdaDeaths = 0
  let kdaGames = 0
  let kpTop = 0
  let kpBottom = 0
  const champions = new Map<number, ChampionUsage>()

  for (const p of participations) {
    if (p.won === true) wins += 1
    if (p.won === false) losses += 1
    addTo(totals.kills, p.kills)
    addTo(totals.deaths, p.deaths)
    addTo(totals.assists, p.assists)
    addTo(totals.cs, p.cs)
    addTo(totals.damage, p.damage)
    addTo(totals.gold, p.gold)
    const minutes = p.match.duration ? p.match.duration / 60 : null
    if (minutes) {
      for (const key of ['cs', 'damage', 'gold'] as const) {
        if (p[key] !== null) {
          perMinute[key].sum += p[key]
          perMinute[key].count += minutes
        }
      }
    }
    if (p.kills !== null && p.deaths !== null && p.assists !== null) {
      kdaTop += p.kills + p.assists
      kdaDeaths += p.deaths
      kdaGames += 1
    }
    const teamKills = p.side.stats?.kills ?? null
    if (p.kills !== null && p.assists !== null && teamKills) {
      kpTop += p.kills + p.assists
      kpBottom += teamKills
    }
    if (p.championId !== null) {
      const usage = champions.get(p.championId) ?? {
        key: String(p.championId),
        championId: p.championId,
        games: 0,
        wins: 0,
        kills: newTotal(),
        deaths: newTotal(),
        assists: newTotal(),
        kda: null,
      }
      usage.games += 1
      if (p.won) usage.wins += 1
      addTo(usage.kills, p.kills)
      addTo(usage.deaths, p.deaths)
      addTo(usage.assists, p.assists)
      champions.set(p.championId, usage)
    }
  }

  for (const usage of champions.values()) {
    usage.kda = usage.deaths.count ? (usage.kills.sum + usage.assists.sum) / Math.max(1, usage.deaths.sum) : null
  }
  const positions = countBy(participations, (p) => p.position || null, (p) => p.won)

  return {
    games: participations.length,
    wins,
    losses,
    winRate: ratio(wins, wins + losses),
    ...totals,
    kda: kdaGames ? kdaTop / Math.max(1, kdaDeaths) : null,
    killParticipation: ratio(kpTop, kpBottom),
    csPerMin: ratio(perMinute.cs.sum, perMinute.cs.count),
    damagePerMin: ratio(perMinute.damage.sum, perMinute.damage.count),
    goldPerMin: ratio(perMinute.gold.sum, perMinute.gold.count),
    champions: [...champions.values()].sort((a, b) => b.games - a.games || b.wins - a.wins),
    positions,
    mainPosition: positions[0]?.key ?? null,
  }
}

export const compareMatches = (a: Match, b: Match) =>
  (a.round ?? Infinity) - (b.round ?? Infinity) || a.order - b.order

export function buildLeague(database: Database): League {
  const issues: string[] = []
  const rows = (name: string): Row[] => database[name] ?? []

  const championNames = new Map<number, string>()
  for (const row of rows('Champions')) {
    const id = toNumber(row.ID)
    if (id !== null) championNames.set(id, toText(row.Name) || `Champion ${id}`)
  }
  const championName = (id: number) => championNames.get(id) ?? `Champion ${id}`

  const players = new Map<string, Player>()
  const makePlayer = (puuid: string, gameName = '', tagline = ''): Player => ({
    puuid,
    gameName,
    tagline,
    name: gameName || 'Unknown player',
    riotId: gameName ? (tagline ? `${gameName}#${tagline}` : gameName) : puuid,
  })
  for (const row of rows('Players')) {
    const puuid = toText(row.PUUID)
    if (puuid) players.set(puuid, makePlayer(puuid, toText(row['Game Name']), toText(row.Tagline)))
  }
  const playerFor = (puuid: string): Player => {
    let player = players.get(puuid)
    if (!player) {
      issues.push(`PUUID ${puuid} is not in the Players table.`)
      player = makePlayer(puuid)
      players.set(puuid, player)
    }
    return player
  }

  const teams = new Map<string, Team>()
  const makeTeam = (id: string, name: string): Team => ({
    id,
    name: name || id,
    seasonKey: seasonKeyOf(id),
    roster: [],
    matches: [],
    wins: 0,
    losses: 0,
    forfeitWins: 0,
    forfeitLosses: 0,
    games: 0,
    winRate: null,
    rank: 0,
    form: [],
    streak: null,
    blue: { wins: 0, losses: 0 },
    red: { wins: 0, losses: 0 },
    kills: newTotal(),
    deaths: newTotal(),
    gold: newTotal(),
    towers: newTotal(),
    dragons: newTotal(),
    voidGrubs: newTotal(),
    riftHeralds: newTotal(),
    barons: newTotal(),
    inhibitors: newTotal(),
    firstBloods: newTotal(),
    duration: newTotal(),
    killDiff: 0,
    picks: [],
    bansBy: [],
    bansAgainst: [],
    players: [],
  })
  for (const row of rows('Teams')) {
    const id = toText(row.ID)
    if (!id) continue
    const team = makeTeam(id, toText(row.Name))
    for (const slot of ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Sub 1', 'Sub 2', 'Sub 3', 'Sub 4', 'Sub 5']) {
      const puuid = toText(row[slot])
      if (puuid) team.roster.push({ player: playerFor(puuid), slot, sub: slot.startsWith('Sub') })
    }
    teams.set(id, team)
  }
  const teamFor = (id: string): Team => {
    let team = teams.get(id)
    if (!team) {
      issues.push(`Team ${id} is not in the Teams table.`)
      team = makeTeam(id, `Unknown team (${id})`)
      teams.set(id, team)
    }
    return team
  }

  const matches = new Map<string, Match>()
  rows('Matches').forEach((row, order) => {
    const id = toText(row['Game ID'])
    const blueId = toText(row['Blue Team ID'])
    const redId = toText(row['Red Team ID'])
    if (!id || !blueId || !redId) {
      if (id || blueId || redId) issues.push(`Match row ${order + 1} is missing its Game ID or a team.`)
      return
    }
    const blueTeam = teamFor(blueId)
    const redTeam = teamFor(redId)
    const seasonKey = blueTeam.seasonKey !== OTHER_SEASON ? blueTeam.seasonKey : redTeam.seasonKey
    const match = {
      id,
      seasonKey,
      round: toNumber(row.Round),
      order,
      winner: null,
      forfeit: id.toUpperCase().startsWith('FORFEIT-'),
      hasData: false,
      duration: toNumber(row.Duration) || null,
      startTime: toDate(row['Start Timestamp']),
    } as unknown as Match
    const makeSide = (side: 'blue' | 'red', team: Team): Side =>
      ({ side, team, won: null, stats: null, participants: [], match }) as unknown as Side
    match.blue = makeSide('blue', blueTeam)
    match.red = makeSide('red', redTeam)
    match.blue.opponent = match.red
    match.red.opponent = match.blue
    const winnerId = toText(row.Winner)
    if (winnerId) {
      const winner = [match.blue, match.red].find((side) => side.team.id === winnerId)
      if (winner) {
        match.winner = winner
        winner.won = true
        winner.opponent.won = false
      } else {
        issues.push(`Match ${id} winner ${winnerId} is not one of its teams.`)
      }
    }
    blueTeam.matches.push(match)
    if (redTeam !== blueTeam) redTeam.matches.push(match)
    matches.set(id, match)
  })

  const sideOf = (match: Match | undefined, teamId: string): Side | undefined =>
    match && [match.blue, match.red].find((side) => side.team.id === teamId)

  for (const row of rows('MatchTeams')) {
    const gameId = toText(row['Game ID'])
    const side = sideOf(matches.get(gameId), toText(row['Team ID']))
    if (!side) {
      if (gameId) issues.push(`MatchTeams row for ${gameId} / ${toText(row['Team ID'])} has no matching match side.`)
      continue
    }
    side.stats = {
      bans: ['Ban 1', 'Ban 2', 'Ban 3', 'Ban 4', 'Ban 5']
        .map((column) => toNumber(row[column]))
        .filter((ban): ban is number => ban !== null && ban > 0),
      firstBlood: toBoolean(row['First Blood']),
      kills: toNumber(row.Kills),
      towers: toNumber(row.Towers),
      inhibitors: toNumber(row.Inhibitors),
      dragons: toNumber(row.Dragons),
      voidGrubs: toNumber(row['Void Grubs']),
      riftHeralds: toNumber(row['Rift Herald']),
      barons: toNumber(row.Barons),
    }
    side.match.hasData = true
  }

  for (const row of rows('MatchParticipants')) {
    const gameId = toText(row['Game ID'])
    const side = sideOf(matches.get(gameId), toText(row['Team ID']))
    const puuid = toText(row.PUUID)
    if (!side || !puuid) {
      if (gameId) issues.push(`MatchParticipants row for ${gameId} / ${puuid || 'no PUUID'} has no matching match side.`)
      continue
    }
    side.participants.push({
      match: side.match,
      side,
      player: playerFor(puuid),
      championId: toNumber(row.Champion),
      position: toText(row.Position).toUpperCase(),
      kills: toNumber(row.Kills),
      deaths: toNumber(row.Deaths),
      assists: toNumber(row.Assists),
      cs: toNumber(row.CS),
      damage: toNumber(row.Damage),
      gold: toNumber(row.Gold),
      won: side.won,
    })
    side.match.hasData = true
  }

  for (const match of matches.values()) {
    for (const side of [match.blue, match.red]) {
      side.participants.sort(
        (a, b) => positionOrder(a.position) - positionOrder(b.position) || a.player.name.localeCompare(b.player.name),
      )
    }
  }

  const seasonKeys = new Set([...teams.values()].map((team) => team.seasonKey))
  for (const match of matches.values()) seasonKeys.add(match.seasonKey)
  const seasons = [...seasonKeys]
    .map((key) =>
      buildSeason(
        key,
        [...teams.values()].filter((team) => team.seasonKey === key),
        [...matches.values()].filter((match) => match.seasonKey === key).sort(compareMatches),
        championName,
      ),
    )
    .sort((a, b) => (b.number ?? -Infinity) - (a.number ?? -Infinity))

  const bySeason = new Map(seasons.map((season) => [season.key, season]))
  return {
    seasons,
    latest: seasons.find((season) => season.number !== null) ?? seasons[0] ?? null,
    season: (key) => bySeason.get(key),
    championName,
    playerSeasons: (puuid) =>
      seasons.map((season) => season.playerSeason(puuid)).filter((entry): entry is PlayerSeason => !!entry),
    issues,
  }
}

export function positionOrder(position: string): number {
  const index = (POSITIONS as readonly string[]).indexOf(position)
  return index === -1 ? POSITIONS.length : index
}

function buildSeason(key: string, teams: Team[], matches: Match[], championName: (id: number) => string): Season {
  const number = key === OTHER_SEASON ? null : Number(key)
  const participants = matches.flatMap((match) => [...match.blue.participants, ...match.red.participants])
  const summary: SeasonSummary = {
    matches: matches.length,
    played: 0,
    forfeits: 0,
    decided: 0,
    pending: 0,
    kills: newTotal(),
    duration: newTotal(),
    longest: null,
    shortest: null,
    blueWins: 0,
    sideGames: 0,
    uniquePicks: 0,
    uniqueBans: 0,
  }

  for (const team of teams) {
    const pickRows: Participant[] = []
    const bansBy: number[] = []
    const bansAgainst: number[] = []
    team.matches.sort(compareMatches)
    for (const match of team.matches) {
      const side = match.blue.team === team ? match.blue : match.red
      if (side.won !== null) {
        const result = side.won ? 'W' : 'L'
        team.form.push(result)
        const record = side.side === 'blue' ? team.blue : team.red
        if (side.won) {
          team.wins += 1
          record.wins += 1
          if (match.forfeit) team.forfeitWins += 1
        } else {
          team.losses += 1
          record.losses += 1
          if (match.forfeit) team.forfeitLosses += 1
        }
      }
      if (side.stats) {
        addTo(team.kills, side.stats.kills)
        addTo(team.deaths, side.opponent.stats?.kills ?? null)
        addTo(team.towers, side.stats.towers)
        addTo(team.dragons, side.stats.dragons)
        addTo(team.voidGrubs, side.stats.voidGrubs)
        addTo(team.riftHeralds, side.stats.riftHeralds)
        addTo(team.barons, side.stats.barons)
        addTo(team.inhibitors, side.stats.inhibitors)
        addTo(team.firstBloods, side.stats.firstBlood === null ? null : Number(side.stats.firstBlood))
        bansBy.push(...side.stats.bans)
        bansAgainst.push(...(side.opponent.stats?.bans ?? []))
      }
      if (match.hasData) addTo(team.duration, match.duration)
      const golds = side.participants.map((p) => p.gold).filter((gold): gold is number => gold !== null)
      if (golds.length > 0) addTo(team.gold, golds.reduce((sum, gold) => sum + gold, 0))
      pickRows.push(...side.participants)
    }
    team.games = team.wins + team.losses
    team.winRate = ratio(team.wins, team.games)
    team.killDiff = team.kills.sum - team.deaths.sum
    const last = team.form.at(-1)
    if (last) {
      let count = 0
      for (let index = team.form.length - 1; index >= 0 && team.form[index] === last; index -= 1) count += 1
      team.streak = { result: last, count }
    }
    team.picks = summarizeParticipations(pickRows).champions
    team.bansBy = countBy(bansBy, (id) => String(id))
    team.bansAgainst = countBy(bansAgainst, (id) => String(id))
  }

  teams.sort(
    (a, b) =>
      b.wins - a.wins ||
      a.losses - b.losses ||
      b.killDiff - a.killDiff ||
      a.name.localeCompare(b.name),
  )
  teams.forEach((team, index) => {
    const previous = teams[index - 1]
    team.rank = previous && previous.wins === team.wins && previous.losses === team.losses ? previous.rank : index + 1
  })

  for (const match of matches) {
    if (match.forfeit) summary.forfeits += 1
    if (match.winner) summary.decided += 1
    else summary.pending += 1
    if (!match.hasData || match.forfeit) continue
    summary.played += 1
    const blueKills = match.blue.stats?.kills ?? null
    const redKills = match.red.stats?.kills ?? null
    if (blueKills !== null && redKills !== null) addTo(summary.kills, blueKills + redKills)
    if (match.duration) {
      addTo(summary.duration, match.duration)
      if (!summary.longest || match.duration > (summary.longest.duration ?? 0)) summary.longest = match
      if (!summary.shortest || match.duration < (summary.shortest.duration ?? Infinity)) summary.shortest = match
    }
    if (match.winner) {
      summary.sideGames += 1
      if (match.winner === match.blue) summary.blueWins += 1
    }
  }

  const playerRows = new Map<string, Participant[]>()
  for (const participant of participants) {
    const list = playerRows.get(participant.player.puuid) ?? []
    list.push(participant)
    playerRows.set(participant.player.puuid, list)
  }
  const rosterTeams = new Map<string, { player: Player; teams: Team[] }>()
  for (const team of teams) {
    for (const slot of team.roster) {
      const entry = rosterTeams.get(slot.player.puuid) ?? { player: slot.player, teams: [] }
      if (!entry.teams.includes(team)) entry.teams.push(team)
      rosterTeams.set(slot.player.puuid, entry)
    }
  }
  const puuids = new Set([...rosterTeams.keys(), ...playerRows.keys()])
  const players: PlayerSeason[] = [...puuids].map((puuid) => {
    const rows = (playerRows.get(puuid) ?? []).sort((a, b) => compareMatches(a.match, b.match))
    const player = rows[0]?.player ?? rosterTeams.get(puuid)!.player
    const playedFor = countBy(rows, (p) => p.side.team.id)
    const teamList = [...(rosterTeams.get(puuid)?.teams ?? [])]
    for (const usage of playedFor) {
      const team = rows.find((p) => p.side.team.id === usage.key)!.side.team
      if (!teamList.includes(team)) teamList.push(team)
    }
    const primaryId = playedFor[0]?.key
    return {
      ...summarizeParticipations(rows),
      player,
      seasonKey: key,
      teams: teamList,
      primaryTeam: teamList.find((team) => team.id === primaryId) ?? teamList[0] ?? null,
      participations: rows,
    }
  })
  players.sort((a, b) => b.games - a.games || a.player.name.localeCompare(b.player.name))
  for (const team of teams) {
    team.players = players.filter((entry) => entry.teams.includes(team))
  }

  const playedMatches = matches.filter((match) => match.hasData && !match.forfeit)
  const championRows = new Map<number, Participant[]>()
  const championBans = new Map<number, number>()
  const presence = new Map<number, Set<string>>()
  const markPresent = (id: number, match: Match) => {
    const set = presence.get(id) ?? new Set<string>()
    set.add(match.id)
    presence.set(id, set)
  }
  for (const participant of participants) {
    if (participant.championId === null) continue
    const list = championRows.get(participant.championId) ?? []
    list.push(participant)
    championRows.set(participant.championId, list)
    markPresent(participant.championId, participant.match)
  }
  for (const match of matches) {
    for (const side of [match.blue, match.red]) {
      for (const ban of side.stats?.bans ?? []) {
        championBans.set(ban, (championBans.get(ban) ?? 0) + 1)
        markPresent(ban, match)
      }
    }
  }
  const championIds = new Set([...championRows.keys(), ...championBans.keys()])
  const champions: ChampionSeason[] = [...championIds].map((id) => {
    const rows = championRows.get(id) ?? []
    const byPlayer = countBy(rows, (p) => p.player.puuid, (p) => p.won)
    return {
      id,
      name: championName(id),
      picks: rows.length,
      bans: championBans.get(id) ?? 0,
      presence: ratio(presence.get(id)?.size ?? 0, playedMatches.length),
      totals: summarizeParticipations(rows),
      players: byPlayer.map((usage) => ({
        ...usage,
        player: rows.find((p) => p.player.puuid === usage.key)!.player,
      })),
      participations: rows,
    }
  })
  champions.sort((a, b) => (b.presence ?? 0) - (a.presence ?? 0) || b.picks - a.picks || a.name.localeCompare(b.name))
  summary.uniquePicks = championRows.size
  summary.uniqueBans = championBans.size

  const rounds: Round[] = []
  for (const match of matches) {
    const last = rounds.at(-1)
    if (last && last.round === match.round) last.matches.push(match)
    else rounds.push({ round: match.round, matches: [match] })
  }

  const teamById = new Map(teams.map((team) => [team.id, team]))
  const matchById = new Map(matches.map((match) => [match.id, match]))
  const playerById = new Map(players.map((entry) => [entry.player.puuid, entry]))
  const championById = new Map(champions.map((champion) => [champion.id, champion]))
  return {
    key,
    number,
    label: number === null ? 'Other' : `Season ${number}`,
    teams,
    matches,
    rounds,
    players,
    champions,
    participants,
    summary,
    team: (id) => teamById.get(id),
    match: (id) => matchById.get(id),
    playerSeason: (puuid) => playerById.get(puuid),
    champion: (id) => championById.get(id),
  }
}
