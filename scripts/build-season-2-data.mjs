// Builds data/season-2/season-2.json from the Season 2 source snapshots.
// Run with: npm run data:season-2
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'data', 'season-2')
const sourceDir = join(dataDir, 'source')
const outputPath = join(dataDir, 'season-2.json')

const SLOT_COLUMNS = [1, 7, 13, 19, 25]
const SUB_COLUMNS = [31, 32]
const STAT_FIELDS = ['Kills', 'Deaths', 'Assists', 'CS', 'Damage', 'Gold']
const SLOT_NUMBERS = [1, 2, 3, 4, 5]

export const TABLE_COLUMNS = {
  Teams: ['ID', 'Name', ...SLOT_NUMBERS.map((n) => `Player ${n}`), ...SLOT_NUMBERS.map((n) => `Sub ${n}`)],
  Players: ['PUUID', 'Game Name', 'Tagline', 'Discord'],
  Matches: [
    'Round',
    'Blue Team ID',
    'Red Team ID',
    'Tournament Code',
    'Game ID',
    'Winner',
    'Start Timestamp',
    'Duration',
  ],
  MatchTeams: [
    'Game ID',
    'Team ID',
    ...SLOT_NUMBERS.map((n) => `Ban ${n}`),
    'First Blood',
    'Kills',
    'Towers',
    'Inhibitors',
    'Dragons',
    'Void Grubs',
    'Rift Herald',
    'Barons',
  ],
  // Proposed: the live MatchParticipants table still has placeholder column names.
  MatchParticipants: ['Game ID', 'Team ID', 'PUUID', 'Champion', 'Position', ...STAT_FIELDS],
  Champions: ['ID', 'Name'],
}

export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

const readSource = (name) => parseCsv(readFileSync(join(sourceDir, `${name}.csv`), 'utf8'))
const cell = (row, index) => (row?.[index] ?? '').trim()

export const normalizeName = (value) =>
  String(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^\p{L}\p{N}]/gu, '')

const normalizeChampion = (value) => String(value).toLowerCase().replace(/[^a-z]/g, '')

const slugify = (value) =>
  String(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

const pad2 = (number) => String(number).padStart(2, '0')
const isBlankMarker = (value) => value === '' || value === '-'
const isToken = (value) => typeof value === 'string' && value.startsWith('LOOKUP:')
// Player Stats columns are in role order (slot 5 has support-level CS, slot 4 the most gold).
const POSITIONS = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']
const fakePuuid = (slug) => `FAKE-PUUID-${slug}`
const fakeGameId = (matchKey) => `FAKE-GAME-${matchKey}`
const forfeitGameId = (matchKey) => `FORFEIT-${matchKey}`

function toNumber(value) {
  if (isBlankMarker(value) || value.startsWith('#')) return null
  const number = Number(value.replace(/,/g, ''))
  return Number.isFinite(number) ? number : null
}

export function parseGameTime(raw, overrides = {}) {
  const value = overrides[raw] ?? raw
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

export function parseRiotId(text) {
  const index = text.indexOf('#')
  if (index < 0) return null
  const gameName = text.slice(0, index).trim()
  const tagLine = text.slice(index + 1).trim()
  if (!gameName || !/^[\p{L}\p{N}]{2,5}$/u.test(tagLine)) return null
  return { gameName, tagLine }
}

const riotKey = ({ gameName, tagLine }) => `${normalizeName(gameName)}#${tagLine.toLowerCase()}`
const formatRiotId = ({ gameName, tagLine }) => `${gameName}#${tagLine}`

class Issues {
  list = []

  add(category, message, source) {
    this.list.push(source ? { category, message, source } : { category, message })
  }
}

class TeamResolver {
  constructor(teams, aliases) {
    this.byKey = new Map()
    this.unknown = []
    for (const team of teams) this.byKey.set(normalizeName(team.name), team)
    for (const [alias, name] of Object.entries(aliases)) {
      const team = this.byKey.get(normalizeName(name))
      if (!team) throw new Error(`Team alias "${alias}" points to unknown team "${name}"`)
      this.byKey.set(normalizeName(alias), team)
    }
  }

  resolve(name, context) {
    const team = this.byKey.get(normalizeName(name))
    if (team) return team
    this.unknown.push(`"${name}" (${context})`)
    return { id: `UNKNOWN:${name}`, name }
  }

  assertResolved() {
    if (this.unknown.length) {
      throw new Error(`Unresolved team names; add teamAliases to curation.json:\n${this.unknown.join('\n')}`)
    }
  }
}

function createChampionResolver(curation, issues) {
  const data = JSON.parse(readFileSync(join(sourceDir, 'champions.json'), 'utf8'))
  const byName = new Map(data.champions.map((champion) => [normalizeChampion(champion.name), champion]))
  for (const [alias, name] of Object.entries(curation.championAliases)) {
    const champion = byName.get(normalizeChampion(name))
    if (!champion) throw new Error(`Champion alias "${alias}" points to unknown champion "${name}"`)
    byName.set(normalizeChampion(alias), champion)
  }
  const unknown = new Map()
  return {
    data,
    resolve(raw, source) {
      if (isBlankMarker(raw)) return null
      const champion = byName.get(normalizeChampion(raw))
      if (!champion && !unknown.has(raw)) {
        unknown.set(raw, source)
        issues.add('champion', `Unrecognized champion "${raw}"; left blank`, source)
      }
      return champion ?? null
    },
  }
}

function loadTeams(curation) {
  const teams = readSource('rosters')
    .slice(1)
    .filter((row) => cell(row, 0))
    .map((row) => ({
      number: Number(cell(row, 0)),
      name: cell(row, 1),
      rosterColumns: [2, 3, 4, 5, 6, 7].map((column) => cell(row, column)),
    }))
  for (const extra of curation.extraTeams) teams.push({ ...extra, rosterColumns: [] })
  for (const team of teams) {
    team.id = `S2-T${pad2(team.number)}`
    team.opggRiotIds = []
  }
  return teams.sort((a, b) => a.number - b.number)
}

function loadOpgg(resolver) {
  for (const row of readSource('opgg').slice(1)) {
    if (!cell(row, 1)) continue
    const team = resolver.resolve(cell(row, 1), 'OP.GG')
    const link = cell(row, 2)
    let summoners = ''
    try {
      summoners = new URL(link).searchParams.get('summoners') ?? ''
    } catch {
      summoners = ''
    }
    team.opggLink = link
    team.opggRiotIds = summoners
      .split(',')
      .map((value) => value.replace(/<@\d+>/g, '').replace(/\*+$/, '').trim())
      .filter(Boolean)
  }
}

function loadSchedule(resolver) {
  const rows = readSource('schedule')
  const matches = []
  for (const [weekColumn, matchColumn, winnerColumn] of [
    [0, 1, 2],
    [3, 4, 5],
  ]) {
    let week = null
    let index = 0
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]
      if (cell(row, weekColumn)) {
        week = Number(cell(row, weekColumn).replace(/\D/g, ''))
        index = 0
      }
      const text = cell(row, matchColumn)
      if (isBlankMarker(text)) continue
      const parts = text.split(/\s+vs\s+/i)
      if (parts.length !== 2) throw new Error(`Cannot parse schedule entry "${text}"`)
      index++
      const source = `Schedule!${String.fromCharCode(65 + matchColumn)}${r + 1}`
      const winnerText = cell(row, winnerColumn)
      const winnerName = winnerText.replace(/\(FF\)/i, '').trim()
      const hasWinner = !isBlankMarker(winnerName) && winnerName.toUpperCase() !== 'N/A'
      matches.push({
        key: `S2-W${week}-M${pad2(index)}`,
        week,
        source,
        sourceText: text,
        sourceWinner: winnerText,
        first: resolver.resolve(parts[0], source),
        second: resolver.resolve(parts[1], source),
        scheduleWinner: hasWinner ? resolver.resolve(winnerName, `${source} winner`) : null,
        scheduleForfeit: /\(FF\)/i.test(winnerText),
        scheduleNotPlayed: winnerName.toUpperCase() === 'N/A',
      })
    }
  }
  return matches.sort((a, b) => a.week - b.week || a.key.localeCompare(b.key))
}

// Stats rows sometimes annotate forfeits, e.g. "Pee Wee (W FF)" or "Tower Takers (N/A)".
// Returns null for rows that are not games (blank, counts, averages, notes).
function parseOpponent(text) {
  if (isBlankMarker(text) || /^\d+$/.test(text) || /^\(.*\)$/.test(text)) return null
  if (/^average$/i.test(text)) return null
  if (/^force win$/i.test(text)) return { name: null, annotation: 'Force win' }
  const match = /^(.*?)\s*\(([^)]*)\)$/.exec(text)
  if (!match) return { name: text, annotation: null }
  return { name: match[1].trim(), annotation: match[2].trim() }
}

function resolveOpponent(parsed, source, resolver, overrides) {
  const override = overrides.get(source)
  if (override) {
    override.used = true
    return resolver.resolve(override.opponent, source)
  }
  return parsed.name ? resolver.resolve(parsed.name, source) : null
}

function findBlocks(rows, isHeader) {
  const starts = []
  rows.forEach((row, index) => {
    if (isHeader(row, index)) starts.push(index)
  })
  return starts.map((start, i) => ({ start, end: starts[i + 1] ?? rows.length }))
}

function loadPlayerStats(resolver, overrides) {
  const rows = readSource('player-stats')
  const blocks = findBlocks(rows, (row, index) => cell(row, 1) !== '' && cell(rows[index + 1], 1) === 'Kills')
  return blocks.map(({ start, end }) => {
    const header = rows[start]
    const team = resolver.resolve(cell(header, 0), `Player Stats!A${start + 1}`)
    const games = []
    for (let r = start + 2; r < end; r++) {
      const row = rows[r]
      const parsed = parseOpponent(cell(row, 0))
      if (!parsed) continue
      const source = `Player Stats!A${r + 1}`
      const slots = SLOT_COLUMNS.map((column) =>
        Object.fromEntries(STAT_FIELDS.map((field, i) => [field, toNumber(cell(row, column + i))])),
      )
      games.push({
        source,
        opponent: resolveOpponent(parsed, source, resolver, overrides),
        annotation: parsed.annotation,
        slots,
        substitutes: SUB_COLUMNS.map((column) => cell(row, column)).filter(Boolean),
        empty: slots.every((slot) => STAT_FIELDS.every((field) => !slot[field])),
      })
    }
    return {
      kind: 'playerStats',
      team,
      source: `Player Stats!A${start + 1}`,
      slotNames: SLOT_COLUMNS.map((column) => cell(header, column)),
      games,
    }
  })
}

function loadTeamStats(resolver, overrides) {
  const rows = readSource('team-stats')
  const blocks = findBlocks(rows, (row) => cell(row, 1) === 'Void Obj')
  return blocks.map(({ start, end }) => {
    const team = resolver.resolve(cell(rows[start], 0), `Team Stats!A${start + 1}`)
    const games = []
    for (let r = start + 1; r < end; r++) {
      const row = rows[r]
      const parsed = parseOpponent(cell(row, 0))
      if (!parsed) continue
      const source = `Team Stats!A${r + 1}`
      const game = {
        source,
        opponent: resolveOpponent(parsed, source, resolver, overrides),
        annotation: parsed.annotation,
        voidGrubs: toNumber(cell(row, 1)),
        dragons: toNumber(cell(row, 2)),
        towers: toNumber(cell(row, 3)),
        gameTime: cell(row, 4),
        picks: [5, 6, 7, 8, 9].map((column) => cell(row, column)),
        bans: [10, 11, 12, 13, 14].map((column) => cell(row, column)),
        kills: toNumber(cell(row, 15)),
        deaths: toNumber(cell(row, 16)),
        assists: toNumber(cell(row, 17)),
        cs: toNumber(cell(row, 18)),
        damage: toNumber(cell(row, 19)),
        gold: toNumber(cell(row, 20)),
      }
      game.empty =
        game.picks.every(isBlankMarker) &&
        isBlankMarker(game.gameTime) &&
        [game.kills, game.deaths, game.assists, game.cs, game.damage, game.gold].every((value) => !value)
      games.push(game)
    }
    return { kind: 'teamStats', team, source: `Team Stats!A${start + 1}`, games }
  })
}

function attachGames(matches, blocks, issues) {
  const byTeam = new Map(blocks.map((block) => [block.team.id, block]))
  for (const match of matches) {
    for (const [team, opponent] of [
      [match.first, match.second],
      [match.second, match.first],
    ]) {
      const block = byTeam.get(team.id)
      const game = block?.games.find((candidate) => !candidate.match && candidate.opponent === opponent)
      if (game) {
        game.match = match
        match[blocks[0].kind].set(team.id, game)
      }
    }
  }
  for (const block of blocks) {
    for (const game of block.games) {
      if (!game.match) {
        issues.add(
          'alignment',
          `${block.team.name} row vs ${game.opponent?.name ?? game.annotation} has no schedule entry; ignored`,
          game.source,
        )
      }
    }
  }
}

function loadBroadcasts(resolver, matches, curation, issues) {
  const overrides = new Map(curation.broadcastOverrides.map((o) => [normalizeName(o.source), o]))
  return readSource('broadcasting')
    .filter((row) => cell(row, 0))
    .map((row, index) => {
      const sourceText = cell(row, 0)
      const override = overrides.get(normalizeName(sourceText))
      const pairText = override?.match ?? sourceText
      const [a, b] = pairText.split(/\s+vs\s+/i).map((name) => resolver.resolve(name, `Broadcasting!A${index + 1}`))
      const match = matches.find(
        (m) => m.week === curation.broadcastWeek && new Set([m.first, m.second, a, b]).size === 2,
      )
      if (!match) issues.add('broadcast', `No week ${curation.broadcastWeek} match for "${sourceText}"`, `Broadcasting!A${index + 1}`)
      else if (match.tournamentCode) throw new Error(`Two tournament codes for ${match.key}`)
      else match.tournamentCode = cell(row, 1)
      return {
        source: `Broadcasting!A${index + 1}`,
        text: sourceText,
        tournamentCode: cell(row, 1),
        matchKey: match?.key ?? null,
        ...(override ? { note: override.reason } : {}),
      }
    })
}

const FORFEIT_WIN = /\bW FF\b|win by default|force win/i
const FORFEIT_LOSS = /\bL FF\b/i

function classifyMatches(matches, curation, resolver, issues) {
  const resultOverrides = new Map(curation.resultOverrides.map((o) => [o.match, o]))
  for (const match of matches) {
    const override = resultOverrides.get(match.key)
    if (override) {
      if (normalizeName(override.sourceText) !== normalizeName(match.sourceText)) {
        throw new Error(`resultOverrides ${match.key} expected "${override.sourceText}" but found "${match.sourceText}"`)
      }
      match.scheduleWinner = resolver.resolve(override.winner, `resultOverrides ${match.key}`)
      issues.add('result', `${match.key}: ${override.reason}`, match.source)
    }
    const games = [...match.playerStats, ...match.teamStats]
    let forfeitWinner = match.scheduleForfeit ? match.scheduleWinner : null
    for (const [teamId, game] of games) {
      if (!game.annotation) continue
      const team = teamId === match.first.id ? match.first : match.second
      const other = team === match.first ? match.second : match.first
      const implied = FORFEIT_WIN.test(game.annotation) ? team : FORFEIT_LOSS.test(game.annotation) ? other : null
      if (!implied) continue
      if (forfeitWinner && forfeitWinner !== implied) {
        issues.add('forfeit', `${match.key}: conflicting forfeit annotations`, game.source)
      }
      forfeitWinner ??= implied
    }
    const hasStats = games.some(([, game]) => !game.empty)
    if (forfeitWinner) {
      match.status = 'forfeit'
      match.winner = forfeitWinner
      if (match.scheduleNotPlayed) {
        issues.add(
          'forfeit',
          `${match.key} (${match.sourceText}) is N/A on the schedule, but the stats tabs record a forfeit win for ${forfeitWinner.name}; imported as a forfeit`,
          match.source,
        )
      }
    } else if (match.scheduleNotPlayed && !hasStats) {
      match.status = 'not-played'
    } else if (match.scheduleWinner || hasStats) {
      match.status = 'played'
      match.winner = match.scheduleWinner
      if (!match.winner) {
        issues.add('result', `${match.key} (${match.sourceText}) has stats but no recorded winner; Winner is inferred (see assumptions)`, match.source)
      }
    } else {
      match.status = 'not-played'
    }
    if (match.status !== 'played' && hasStats) {
      issues.add('result', `${match.key} has stats but was classified as ${match.status}`, match.source)
    }
  }
}

class PlayerRegistry {
  constructor(curation, issues) {
    this.issues = issues
    this.aliases = new Map(Object.entries(curation.playerAliases).map(([alias, target]) => [normalizeName(alias), target]))
    this.unidentifiedLabels = new Set(curation.unidentifiedPlayerLabels.map(normalizeName))
    this.pool = new Map()
    this.players = new Map()
  }

  addRiotIdCandidate(text, team, tier) {
    const riotId = parseRiotId(text)
    if (!riotId) return
    const name = normalizeName(riotId.gameName)
    if (!this.pool.has(name)) this.pool.set(name, [])
    this.pool.get(name).push({ riotId, key: riotKey(riotId), team, tier })
  }

  canonicalRiotId(key, fallback) {
    const entries = [...this.pool.values()].flat().filter((entry) => entry.key === key)
    const tiers = ['opgg', 'roster', 'stats']
    entries.sort((a, b) => tiers.indexOf(a.tier) - tiers.indexOf(b.tier))
    return entries[0]?.riotId ?? fallback
  }

  searchPool(name, team) {
    const entries = this.pool.get(name) ?? []
    const filters = [
      (entry) => entry.team === team && entry.tier === 'opgg',
      (entry) => entry.team === team,
      (entry) => entry.tier === 'opgg',
      () => true,
    ]
    for (const filter of filters) {
      const keys = [...new Set(entries.filter(filter).map((entry) => entry.key))]
      if (keys.length) return keys
    }
    return []
  }

  identify(raw, team) {
    let name = raw.trim().replace(/\s+/g, ' ')
    const aliased = this.aliases.get(normalizeName(name))
    if (aliased !== undefined) name = aliased
    const normalized = normalizeName(name)
    if (this.unidentifiedLabels.has(normalized)) {
      return {
        key: `unidentified:${team.id}:${normalized}`,
        riotId: null,
        displayName: `${name} (${team.name})`,
        unidentified: true,
      }
    }
    const explicit = parseRiotId(name)
    if (explicit) {
      const key = riotKey(explicit)
      return { key, riotId: this.canonicalRiotId(key, explicit) }
    }
    const keys = this.searchPool(normalized, team)
    if (keys.length === 1) return { key: keys[0], riotId: this.canonicalRiotId(keys[0]) }
    if (keys.length > 1) {
      this.issues.add('player', `"${raw}" matches several Riot IDs (${keys.join(', ')}); treated as unresolved`, team.name)
    }
    return { key: `name:${normalized}`, riotId: null, displayName: name }
  }

  get(raw, team) {
    const identity = this.identify(raw, team)
    let player = this.players.get(identity.key)
    if (!player) {
      player = { ...identity, seenAs: new Set(), firstSeen: this.players.size }
      this.players.set(identity.key, player)
    }
    player.seenAs.add(raw.trim())
    return player
  }

  placeholder(team, n) {
    const key = `placeholder:${team.id}:${n}`
    const player = {
      key,
      riotId: null,
      displayName: `${team.name} Player ${n}`,
      unidentified: true,
      placeholder: true,
      seenAs: new Set(),
      firstSeen: this.players.size,
    }
    this.players.set(key, player)
    return player
  }

  find(raw, team) {
    const player = this.players.get(this.identify(raw, team).key) ?? null
    player?.seenAs.add(raw.trim())
    return player
  }
}

function buildPlayers(teams, playerBlocks, registry, issues) {
  for (const team of teams) {
    team.opggRiotIds.forEach((text) => registry.addRiotIdCandidate(text, team, 'opgg'))
    team.rosterColumns.forEach((text) => registry.addRiotIdCandidate(text, team, 'roster'))
  }
  for (const block of playerBlocks) {
    const names = [...block.slotNames, ...block.games.flatMap((game) => game.substitutes)]
    names.forEach((text) => registry.addRiotIdCandidate(text, block.team, 'stats'))
  }

  const subAppearances = new Map()
  for (const block of playerBlocks) {
    const team = block.team
    team.slots = block.slotNames.map((name) => {
      const [primary, ...others] = name.split('/').map((part) => part.trim())
      if (others.length) {
        issues.add('player', `${team.name} slot "${name}" was shared; games are credited to ${primary} unless the other player is listed as a sub`, block.source)
      }
      return { player: registry.get(primary, team), shared: others.map((other) => registry.get(other, team)) }
    })
    for (const game of block.games) {
      game.substitutePlayers = game.substitutes.map((name) => registry.get(name, team))
      for (const player of game.substitutePlayers) {
        if (!subAppearances.has(player)) subAppearances.set(player, new Set())
        subAppearances.get(player).add(team)
      }
    }
  }

  for (const team of teams) {
    team.rosterHints = []
    team.rosterColumns.forEach((text, index) => {
      if (!text) return
      const player = index === 5 ? registry.get(text, team) : registry.find(text, team)
      if (index === 5) team.sixthPlayer = player
      team.rosterHints.push({ source: `Rosters ${index === 5 ? '6th Player' : `Player ${index + 1}`}`, value: text, player })
    })
    for (const text of team.opggRiotIds) {
      team.rosterHints.push({ source: 'OP.GG', value: text, player: registry.find(text, team) })
    }
  }

  for (const team of teams) {
    if (team.slots) continue
    team.placeholderRoster = true
    team.slots = SLOT_NUMBERS.map((n) => ({ player: registry.placeholder(team, n), shared: [] }))
    issues.add('team', `${team.name} has no roster or player stats in the source; Player 1–5 are invented placeholder players`)
  }

  const players = [...registry.players.values()]
  for (const player of players) {
    player.starterFor = teams.filter((team) => team.slots?.some((slot) => slot.player === player))
    player.sharedSlotFor = teams.filter((team) => team.slots?.some((slot) => slot.shared.includes(player)))
    player.rosterListedBy = teams.filter((team) => team.rosterHints.some((hint) => hint.player === player))
    player.subbedFor = [...(subAppearances.get(player) ?? [])]
    if (player.starterFor.length > 1) {
      issues.add('player', `${[...player.seenAs].join(' / ')} starts for several teams: ${player.starterFor.map((t) => t.name).join(', ')}`)
    }
    player.homeTeam =
      player.starterFor[0] ??
      player.sharedSlotFor[0] ??
      player.rosterListedBy[0] ??
      (player.subbedFor.length === 1 ? player.subbedFor[0] : null)
  }

  const usedSlugs = new Set()
  const ordered = players.sort((a, b) => {
    const team = (a.homeTeam?.number ?? 999) - (b.homeTeam?.number ?? 999)
    return team || a.firstSeen - b.firstSeen
  })
  for (const player of ordered) {
    const base = slugify(player.riotId ? formatRiotId(player.riotId) : player.displayName) || 'player'
    let slug = base
    for (let n = 2; usedSlugs.has(slug); n++) slug = `${base}-${n}`
    usedSlugs.add(slug)
    player.slug = slug
    player.puuid = fakePuuid(slug)
  }

  for (const team of teams) {
    const starters = new Set(team.slots.map((slot) => slot.player))
    const subs = [
      ...team.slots.flatMap((slot) => slot.shared),
      team.sixthPlayer,
      ...ordered.filter((player) => player.homeTeam === team),
    ].filter((player) => player && !starters.has(player))
    team.subs = [...new Set(subs)]
    if (team.subs.length > 5) {
      issues.add(
        'team',
        `${team.name} has ${team.subs.length} subs; only the first 5 fit Sub 1–5 (rest listed in supplemental.teams)`,
      )
    }
  }
  return ordered
}

// Some time cells lost their minutes, e.g. "08:00" where the other team recorded "34:08".
const TRUNCATED_TIME = /^(\d{2}):00$/

function resolveDuration(match, known, issues) {
  const distinct = [...new Set(known.map((d) => d.seconds))]
  if (!distinct.length) return { seconds: null, reason: 'No game time recorded' }
  if (distinct.length === 1) {
    const truncated = TRUNCATED_TIME.exec(known[0].text)
    if (known.length === 1 && truncated && Number(truncated[1]) < 15) {
      issues.add('duration', `${match.key}: only time recorded is "${known[0].text}", likely missing its minutes; Duration left blank`, known[0].game.source)
      return { seconds: null, reason: 'Only recorded time looks truncated' }
    }
    return { seconds: distinct[0] }
  }
  const [a, b] = known
  for (const [bad, good] of [
    [a, b],
    [b, a],
  ]) {
    const truncated = TRUNCATED_TIME.exec(bad.text)
    if (truncated && good.text.endsWith(`:${truncated[1]}`)) {
      issues.add('duration', `${match.key}: used ${good.text}; "${bad.text}" looks like the same time with its minutes dropped`, bad.game.source)
      return { seconds: good.seconds }
    }
  }
  issues.add(
    'duration',
    `${match.key}: teams recorded different game times (${a.text} vs ${b.text}); Duration left blank`,
    `${a.game.source}, ${b.game.source}`,
  )
  return { seconds: null, reason: 'Teams recorded different game times' }
}

// The source never records which result a schedule-less game had; the only evidence is one team's stats.
function inferWinner(match) {
  const recorded = [match.first, match.second]
    .map((team) => ({ team, game: match.teamStats.get(team.id) }))
    .filter(({ game }) => game && !game.empty)
  const evidence = Object.fromEntries(
    recorded.map(({ team, game }) => [team.id, { kills: game.kills, deaths: game.deaths, towers: game.towers, source: game.source }]),
  )
  let winner
  if (recorded.length === 2) {
    const [a, b] = recorded
    winner = (a.game.towers ?? 0) >= (b.game.towers ?? 0) ? a.team : b.team
  } else {
    const { team, game } = recorded[0]
    // Seven or more towers almost always includes the nexus push; fewer suggests the opponent won.
    winner = (game.towers ?? 0) >= 7 ? team : team === match.first ? match.second : match.first
  }
  return { winner, evidence }
}

function slotBaselines(team) {
  const games = (team.playerBlock?.games ?? []).filter((game) => !game.empty && !game.substitutes.length)
  return SLOT_NUMBERS.map((_, i) =>
    Object.fromEntries(
      STAT_FIELDS.map((field) => {
        const values = games.map((game) => game.slots[i][field]).filter((value) => value !== null)
        if (values.length < 2) return [field, null]
        const mean = values.reduce((sum, value) => sum + value, 0) / values.length
        const sd = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length)
        return [field, { mean, sd: Math.max(sd, mean * 0.15, 1) }]
      }),
    ),
  )
}

// How unlike the slot's regular starter a game's stat line is (mean absolute z-score).
function slotSurprise(stats, baseline) {
  let total = 0
  let count = 0
  for (const field of STAT_FIELDS) {
    const value = stats?.[field]
    if (!baseline[field] || value === null || value === undefined) continue
    total += Math.abs(value - baseline[field].mean) / baseline[field].sd
    count++
  }
  return count ? total / count : 0
}

// Picks the five players for one team in one game. Subs replace the slots whose stats
// look least like the regular starter, preferring a slot the sub shares or starts in elsewhere.
function assignParticipants(team, playerGame) {
  const primaries = team.slots.map((slot) => slot.player)
  if (team.placeholderRoster) return { players: primaries, method: 'placeholder-roster' }
  if (!playerGame) return { players: primaries, method: 'no-player-stats' }
  const subs = [...new Set(playerGame.substitutePlayers)].filter((player) => !primaries.includes(player)).slice(0, 5)
  if (!subs.length) {
    return { players: primaries, method: team.slots.some((slot) => slot.shared.length) ? 'shared-slot-primary' : null }
  }
  team.baselines ??= slotBaselines(team)
  const surprise = team.slots.map((_, i) => slotSurprise(playerGame.slots[i], team.baselines[i]))
  const affinity = (player, i) => {
    if (team.slots[i].shared.includes(player)) return 3
    return player.starterFor.some((other) => other !== team && other.slots[i]?.player === player) ? 1.5 : 0
  }
  let best = null
  const search = (k, picks) => {
    if (k === subs.length) {
      const score = picks.reduce((sum, slot, j) => sum + surprise[slot] + affinity(subs[j], slot), 0)
      if (!best || score > best.score) best = { score, picks: [...picks] }
      return
    }
    for (let slot = 0; slot < 5; slot++) {
      if (picks.includes(slot)) continue
      picks.push(slot)
      search(k + 1, picks)
      picks.pop()
    }
  }
  search(0, [])
  const players = [...primaries]
  const substitutions = best.picks.map((slot, j) => {
    players[slot] = subs[j]
    return { slot: slot + 1, sub: subs[j], replaced: primaries[slot], surprise: Math.round(surprise[slot] * 100) / 100 }
  })
  return { players, method: 'sub-slot-inferred', substitutions }
}

function parseStandings() {
  const rows = readSource('standings')
  const divisions = []
  const current = [null, null]
  for (const row of rows) {
    for (const [side, offset] of [
      [0, 0],
      [1, 4],
    ]) {
      const first = cell(row, offset)
      if (!first) continue
      if (/^\d+$/.test(first)) {
        current[side].teams.push({
          name: cell(row, offset + 1),
          place: Number(first),
          wins: Number(cell(row, offset + 2) || 0),
          losses: Number(cell(row, offset + 3) || 0),
        })
      } else if (first !== 'Standings' && !cell(row, offset + 1) && !/STANDINGS/.test(first)) {
        current[side] = { name: first, teams: [] }
        divisions.push(current[side])
      }
    }
  }
  return divisions
}

function main() {
  const curation = JSON.parse(readFileSync(join(dataDir, 'curation.json'), 'utf8'))
  const issues = new Issues()
  const gameTimeOverrides = curation.gameTimeOverrides
  const statRowOverrides = new Map(curation.statRowOpponents.map((o) => [o.source, o]))

  const teams = loadTeams(curation)
  const resolver = new TeamResolver(teams, curation.teamAliases)
  loadOpgg(resolver)
  const matches = loadSchedule(resolver)
  for (const match of matches) {
    match.playerStats = new Map()
    match.teamStats = new Map()
  }
  const playerBlocks = loadPlayerStats(resolver, statRowOverrides)
  const teamBlocks = loadTeamStats(resolver, statRowOverrides)
  const broadcasts = loadBroadcasts(resolver, matches, curation, issues)
  resolver.assertResolved()
  for (const override of statRowOverrides.values()) {
    if (!override.used) throw new Error(`statRowOpponents entry ${override.source} matched no stats row`)
    issues.add('alignment', override.reason, override.source)
  }
  for (const block of playerBlocks) block.team.playerBlock = block
  for (const block of teamBlocks) block.team.teamBlock = block
  attachGames(matches, playerBlocks, issues)
  attachGames(matches, teamBlocks, issues)
  classifyMatches(matches, curation, resolver, issues)

  const champions = createChampionResolver(curation, issues)
  const registry = new PlayerRegistry(curation, issues)
  const players = buildPlayers(teams, playerBlocks, registry, issues)

  const lookups = {}
  const assumptions = []
  const inferredWinnerGames = new Set()

  const teamRows = teams.map((team) => {
    const row = { ID: team.id, Name: team.name }
    SLOT_NUMBERS.forEach((n, i) => {
      row[`Player ${n}`] = team.slots[i].player.puuid
    })
    SLOT_NUMBERS.forEach((n, i) => {
      row[`Sub ${n}`] = team.subs[i]?.puuid ?? ''
    })
    return row
  })

  const playerRows = players.map((player) => {
    lookups[player.puuid] = {
      type: 'PUUID',
      riotId: player.riotId ? formatRiotId(player.riotId) : null,
      ...(player.placeholder ? { placeholder: 'Invented player; the source has no roster for this team' } : {}),
      ...(player.unidentified && !player.placeholder ? { unidentified: 'The source only labels this person generically' } : {}),
      seenAs: [...player.seenAs],
      homeTeam: player.homeTeam?.id ?? null,
      starterFor: player.starterFor.map((team) => team.id),
      subbedFor: player.subbedFor.map((team) => team.id),
      rosterListedBy: player.rosterListedBy.map((team) => team.id),
      missing: ['PUUID', ...(player.riotId ? [] : ['Tagline']), 'Discord'],
      resolve: player.riotId
        ? 'GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}'
        : 'Find the Riot ID first (see seenAs), then look up the account',
    }
    return {
      PUUID: player.puuid,
      'Game Name': player.riotId?.gameName ?? player.displayName,
      Tagline: player.riotId?.tagLine ?? '',
      Discord: '',
    }
  })

  const matchRows = []
  const matchTeamRows = []
  const participantRows = []
  const matchTeamStats = []
  const unplayedMatches = []

  for (const match of matches) {
    if (match.status === 'not-played') {
      unplayedMatches.push({
        key: match.key,
        week: match.week,
        teams: [match.first.id, match.second.id],
        sourceWinner: match.sourceWinner,
        source: match.source,
        ...(match.tournamentCode ? { tournamentCode: match.tournamentCode } : {}),
      })
      continue
    }
    if (match.status === 'forfeit') {
      matchRows.push({
        Round: match.week,
        'Blue Team ID': match.first.id,
        'Red Team ID': match.second.id,
        'Tournament Code': match.tournamentCode ?? '',
        'Game ID': forfeitGameId(match.key),
        Winner: match.winner.id,
        'Start Timestamp': '',
        Duration: '',
      })
      continue
    }

    const gameId = fakeGameId(match.key)
    lookups[gameId] = {
      type: 'GAME_ID',
      match: match.key,
      week: match.week,
      teams: [match.first.name, match.second.name],
      sidesVerified: false,
      source: match.source,
      statsRows: Object.fromEntries(
        [match.first, match.second].map((team) => [
          team.id,
          [match.playerStats.get(team.id)?.source, match.teamStats.get(team.id)?.source].filter(Boolean),
        ]),
      ),
      missing: ['Game ID', ...(match.tournamentCode ? [] : ['Tournament Code']), 'Start Timestamp'],
      resolve: match.tournamentCode
        ? 'GET /lol/match/v5/matches/by-tournament-code/{tournamentCode}/ids'
        : 'Search the players’ match history (match-v5) around the week of play',
    }
    const tournamentCode = match.tournamentCode ?? ''

    const durations = [match.first, match.second]
      .map((team) => match.teamStats.get(team.id))
      .filter((game) => game && !game.empty && game.gameTime)
      .map((game) => {
        const text = gameTimeOverrides[game.gameTime] ?? game.gameTime
        return { game, text, seconds: parseGameTime(text) }
      })
    for (const { game, seconds } of durations) {
      if (seconds === null) issues.add('duration', `Unparseable game time "${game.gameTime}"`, game.source)
    }
    const duration = resolveDuration(
      match,
      durations.filter((d) => d.seconds !== null),
      issues,
    )

    let winner = match.winner?.id
    if (!winner) {
      const inferred = inferWinner(match)
      winner = inferred.winner.id
      inferredWinnerGames.add(gameId)
      assumptions.push({
        type: 'WINNER',
        gameId,
        chosen: winner,
        reason: 'The schedule has no winner; inferred from the recorded team stats (towers destroyed)',
        evidence: inferred.evidence,
      })
    }
    if (duration.seconds === null) {
      lookups[gameId].missing.push('Duration')
      lookups[gameId].durationSourceValues = durations.map((d) => ({ value: d.game.gameTime, source: d.game.source }))
    }

    matchRows.push({
      Round: match.week,
      'Blue Team ID': match.first.id,
      'Red Team ID': match.second.id,
      'Tournament Code': tournamentCode,
      'Game ID': gameId,
      Winner: winner,
      'Start Timestamp': '',
      Duration: duration.seconds ?? '',
    })

    for (const team of [match.first, match.second]) {
      const opponent = team === match.first ? match.second : match.first
      const ts = match.teamStats.get(team.id)
      const teamGame = ts && !ts.empty ? ts : null
      const ps = match.playerStats.get(team.id)
      const playerGame = ps && !ps.empty ? ps : null
      const opponentTs = match.teamStats.get(opponent.id)

      const playerKills = playerGame?.slots.every((slot) => slot.Kills !== null)
        ? playerGame.slots.reduce((sum, slot) => sum + slot.Kills, 0)
        : null
      const opponentDeaths = opponentTs && !opponentTs.empty ? opponentTs.deaths : null
      let kills = teamGame?.kills ?? playerKills
      const statsSource = teamGame?.source ?? playerGame?.source
      if (teamGame?.kills != null && playerKills !== null && teamGame.kills !== playerKills) {
        // Prefer whichever value the opponent's death count corroborates.
        if (playerKills === opponentDeaths) kills = playerKills
        issues.add(
          'stats',
          `${match.key} ${team.name}: Team Stats kills ${teamGame.kills}, Player Stats kills ${playerKills}, ${opponent.name} deaths ${opponentDeaths ?? 'n/a'}; used ${kills}`,
          statsSource,
        )
      } else if (kills !== null && opponentDeaths !== null && opponentDeaths !== kills) {
        issues.add('stats', `${match.key} ${team.name}: kills ${kills} ≠ ${opponent.name} deaths ${opponentDeaths}; used ${kills}`, statsSource)
      }

      const row = { 'Game ID': gameId, 'Team ID': team.id }
      SLOT_NUMBERS.forEach((n, i) => {
        const champion = teamGame && champions.resolve(teamGame.bans[i], teamGame.source)
        row[`Ban ${n}`] = champion?.id ?? ''
      })
      Object.assign(row, {
        'First Blood': '',
        Kills: kills ?? '',
        Towers: teamGame?.towers ?? '',
        Inhibitors: '',
        Dragons: teamGame?.dragons ?? '',
        'Void Grubs': teamGame?.voidGrubs ?? '',
        'Rift Herald': '',
        Barons: '',
      })
      matchTeamRows.push(row)

      const picks = teamGame ? teamGame.picks.map((pick) => champions.resolve(pick, teamGame.source)) : []
      matchTeamStats.push({
        gameId,
        teamId: team.id,
        source: [teamGame?.source, playerGame?.source].filter(Boolean),
        ...(teamGame
          ? {
              picks: teamGame.picks.map((raw, i) => ({ raw, championId: picks[i]?.id ?? null })),
              bans: teamGame.bans.map((raw) => ({ raw, championId: champions.resolve(raw, teamGame.source)?.id ?? null })),
              gameTime: teamGame.gameTime,
              kills: teamGame.kills,
              deaths: teamGame.deaths,
              assists: teamGame.assists,
              cs: teamGame.cs,
              damage: teamGame.damage,
              gold: teamGame.gold,
            }
          : { note: 'No team stats recorded' }),
      })

      const assignment = assignParticipants(team, playerGame)
      if (assignment.method) {
        assumptions.push({
          type: 'PARTICIPANTS',
          gameId,
          teamId: team.id,
          method: assignment.method,
          players: assignment.players.map((player) => player.puuid),
          ...(assignment.substitutions
            ? {
                substitutions: assignment.substitutions.map((s) => ({
                  slot: s.slot,
                  sub: s.sub.puuid,
                  replaced: s.replaced.puuid,
                  surprise: s.surprise,
                })),
              }
            : {}),
        })
      }
      SLOT_NUMBERS.forEach((n, i) => {
        const stats = playerGame?.slots[i]
        participantRows.push({
          'Game ID': gameId,
          'Team ID': team.id,
          PUUID: assignment.players[i].puuid,
          Champion: picks[i]?.id ?? '',
          Position: POSITIONS[i],
          ...Object.fromEntries(STAT_FIELDS.map((name) => [name, stats?.[name] ?? ''])),
        })
      })
    }
  }

  const tables = {
    Teams: teamRows,
    Players: playerRows,
    Matches: matchRows,
    MatchTeams: matchTeamRows,
    MatchParticipants: participantRows,
    Champions: champions.data.champions.map((champion) => ({ ID: champion.id, Name: champion.name })),
  }

  const standings = parseStandings().map((division) => ({
    name: division.name,
    teams: division.teams.map((entry) => {
      const team = resolver.resolve(entry.name, 'Standings')
      const results = matchRows.filter(
        (row) => !inferredWinnerGames.has(row['Game ID']) && [row['Blue Team ID'], row['Red Team ID']].includes(team.id),
      )
      const wins = results.filter((row) => row.Winner === team.id).length
      const losses = results.length - wins
      if (wins !== entry.wins || losses !== entry.losses) {
        issues.add(
          'standings',
          `${team.name}: Standings tab says ${entry.wins}-${entry.losses}, imported results give ${wins}-${losses}`,
        )
      }
      return { teamId: team.id, place: entry.place, sourceWins: entry.wins, sourceLosses: entry.losses, importedWins: wins, importedLosses: losses }
    }),
  }))
  resolver.assertResolved()

  validate(tables, lookups, assumptions)

  const output = {
    format: 'lets-queue-club.season-import',
    formatVersion: 1,
    season: 2,
    generatedBy: 'scripts/build-season-2-data.mjs',
    source: {
      ...curation.source,
      championData: { source: champions.data.source, version: champions.data.version },
    },
    fakeValues: {
      description:
        'Every table value links: all IDs point at existing rows. Values the source does not have are either invented IDs (below) or "" (unknown). Replace an invented ID everywhere it appears once the real one is known; "lookups" describes each one.',
      patterns: {
        'FAKE-PUUID-<player>': 'Invented player PUUID (Players.PUUID, Teams player/sub columns, MatchParticipants.PUUID)',
        'FAKE-GAME-<match>': 'Invented Riot match ID (Matches, MatchTeams, MatchParticipants "Game ID")',
        'FORFEIT-<match>': 'Game ID of a forfeit; no game was played, so it has no MatchTeams or MatchParticipants rows',
      },
      unknown:
        '"" means unknown or not applicable: Tagline (77 players), Discord, Tournament Code (most matches), Start Timestamp, some Durations, First Blood, Inhibitors, Rift Herald, Barons, and stats/bans/champions the source did not record',
    },
    conventions: {
      teamIds: 'S2-T<roster number>. Team Infinity (7) is missing from the Rosters tab; 39–41 are schedule-only teams with invented placeholder players',
      matchKeys: 'S2-W<week>-M<order within the week on the Schedule tab>',
      round: 'Week number',
      sides: 'Blue/Red are the first/second team listed on the schedule; actual sides are unverified until the Game ID is known',
      championIds: 'Ban and Champion values are numeric Champions.ID values (Data Dragon keys)',
      duration: 'Seconds, from the Team Stats tab',
      positions:
        'Player Stats columns 1–5 are treated as TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY (column 5 has support-level CS, column 4 the most gold)',
      participantChampions:
        'The source lists team picks without pairing them to players; pick n is assigned to the player in column n',
      participants: 'Who played each game is inferred where the source is ambiguous; see "assumptions" (type PARTICIPANTS)',
      participantColumns:
        'MatchParticipants uses proposed column names; the live table still has placeholder columns (Column 1–14)',
    },
    tableColumns: TABLE_COLUMNS,
    tables,
    lookups: Object.fromEntries(Object.entries(lookups).sort(([a], [b]) => a.localeCompare(b))),
    assumptions,
    supplemental: {
      divisions: standings,
      teams: teams.map((team) => ({
        teamId: team.id,
        name: team.name,
        ...(team.note ? { note: team.note } : {}),
        ...(team.opggLink ? { opggLink: team.opggLink } : {}),
        subsBeyondFive: team.subs.slice(5).map((player) => player.puuid),
        rosterHints: (team.rosterHints ?? []).map((hint) => ({
          source: hint.source,
          value: hint.value,
          player: hint.player?.puuid ?? null,
        })),
      })),
      freeAgents: players.filter((player) => !player.homeTeam).map((player) => player.puuid),
      unplayedMatches,
      matchTeamStats,
      broadcasts,
    },
    issues: issues.list,
  }

  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)
  printSummary(output)
}

const NUMERIC_COLUMNS = {
  Matches: ['Round', 'Duration'],
  MatchTeams: [...SLOT_NUMBERS.map((n) => `Ban ${n}`), 'Kills', 'Towers', 'Dragons', 'Void Grubs'],
  MatchParticipants: ['Champion', ...STAT_FIELDS],
  Champions: ['ID'],
}

function validate(tables, lookups, assumptions) {
  const errors = []
  const teamIds = new Set(tables.Teams.map((row) => row.ID))
  const puuids = new Set(tables.Players.map((row) => row.PUUID))
  const championIds = new Set(tables.Champions.map((row) => row.ID))
  const gameIds = new Set(tables.Matches.map((row) => row['Game ID']))
  const check = (condition, message) => condition || errors.push(message)
  const unique = (rows, key, label) => {
    const keys = rows.map(key)
    check(new Set(keys).size === keys.length, `Duplicate ${label}`)
  }

  for (const [name, rows] of Object.entries(tables)) {
    for (const row of rows) {
      check(
        JSON.stringify(Object.keys(row)) === JSON.stringify(TABLE_COLUMNS[name]),
        `${name} row has unexpected columns: ${Object.keys(row).join(', ')}`,
      )
      for (const [column, value] of Object.entries(row)) {
        check(!isToken(value), `${name}.${column} still holds placeholder ${value}`)
        if (NUMERIC_COLUMNS[name]?.includes(column)) {
          check(value === '' || Number.isFinite(value), `${name}.${column} is not a number: ${value}`)
        }
      }
    }
  }
  unique(tables.Teams, (row) => row.ID, 'team IDs')
  unique(tables.Players, (row) => row.PUUID, 'PUUIDs')
  unique(tables.Matches, (row) => row['Game ID'], 'Game IDs')
  unique(tables.MatchTeams, (row) => `${row['Game ID']}|${row['Team ID']}`, 'MatchTeams rows')
  unique(tables.MatchParticipants, (row) => `${row['Game ID']}|${row.PUUID}`, 'player in a game')
  unique(tables.Champions, (row) => row.ID, 'champion IDs')

  for (const row of tables.Teams) {
    const members = TABLE_COLUMNS.Teams.slice(2).map((column) => row[column])
    SLOT_NUMBERS.forEach((n) => check(puuids.has(row[`Player ${n}`]), `Teams ${row.ID} Player ${n} references unknown player`))
    members.filter(Boolean).forEach((puuid) => check(puuids.has(puuid), `Teams ${row.ID} references unknown player ${puuid}`))
    check(new Set(members.filter(Boolean)).size === members.filter(Boolean).length, `Teams ${row.ID} lists a player twice`)
  }
  for (const row of tables.Players) check(lookups[row.PUUID]?.type === 'PUUID', `Player ${row.PUUID} has no lookup`)

  const matchesById = new Map(tables.Matches.map((row) => [row['Game ID'], row]))
  for (const row of tables.Matches) {
    const sides = [row['Blue Team ID'], row['Red Team ID']]
    check(sides.every((id) => teamIds.has(id)) && sides[0] !== sides[1], `Match ${row['Game ID']} has invalid teams`)
    check(sides.includes(row.Winner), `Match ${row['Game ID']} winner did not play`)
    const isForfeit = row['Game ID'].startsWith('FORFEIT-')
    check(isForfeit || lookups[row['Game ID']]?.type === 'GAME_ID', `Match ${row['Game ID']} has no lookup`)
    const teamsRows = tables.MatchTeams.filter((teamRow) => teamRow['Game ID'] === row['Game ID'])
    const participants = tables.MatchParticipants.filter((p) => p['Game ID'] === row['Game ID'])
    check(teamsRows.length === (isForfeit ? 0 : 2), `Match ${row['Game ID']} has ${teamsRows.length} MatchTeams rows`)
    check(participants.length === (isForfeit ? 0 : 10), `Match ${row['Game ID']} has ${participants.length} participants`)
    for (const teamId of isForfeit ? [] : sides) {
      check(participants.filter((p) => p['Team ID'] === teamId).length === 5, `Match ${row['Game ID']} ${teamId} lacks 5 participants`)
    }
  }
  const inGame = (row) => {
    const match = matchesById.get(row['Game ID'])
    return match && [match['Blue Team ID'], match['Red Team ID']].includes(row['Team ID'])
  }
  for (const row of tables.MatchTeams) {
    check(inGame(row), `MatchTeams ${row['Game ID']} ${row['Team ID']} is not a team in that game`)
    for (const n of SLOT_NUMBERS) {
      const ban = row[`Ban ${n}`]
      check(ban === '' || championIds.has(ban), `MatchTeams ban ${ban} is not a champion`)
    }
  }
  for (const row of tables.MatchParticipants) {
    check(inGame(row), `MatchParticipants ${row['Game ID']} ${row['Team ID']} is not a team in that game`)
    check(puuids.has(row.PUUID), `Unknown participant ${row.PUUID}`)
    check(row.Champion === '' || championIds.has(row.Champion), `Participant champion ${row.Champion} is not a champion`)
    check(POSITIONS.includes(row.Position), `Unknown position ${row.Position}`)
  }
  for (const assumption of assumptions) {
    check(gameIds.has(assumption.gameId), `Assumption references unknown game ${assumption.gameId}`)
  }
  if (errors.length) throw new Error(`Validation failed:\n${errors.join('\n')}`)
}

function printSummary(output) {
  const counts = Object.entries(output.tables).map(([name, rows]) => `${name}: ${rows.length}`)
  const tally = (items, key) => {
    const result = {}
    for (const item of items) result[key(item)] = (result[key(item)] ?? 0) + 1
    return JSON.stringify(result)
  }
  console.log(`Wrote ${outputPath}`)
  console.log(counts.join(', '))
  console.log(`Lookups: ${tally(Object.values(output.lookups), (l) => l.type)}`)
  console.log(`Assumptions: ${tally(output.assumptions, (a) => a.method ?? a.type)}`)
  console.log(`Unplayed matches: ${output.supplemental.unplayedMatches.length}; issues: ${tally(output.issues, (i) => i.category)}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
