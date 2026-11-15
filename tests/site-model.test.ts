import assert from 'node:assert/strict'
import { test } from 'node:test'
import { daysUntil } from '../src/club.ts'
import { buildLeague } from '../src/data/model.ts'
import type { Database } from '../src/data/types.ts'

const database: Database = {
  Champions: [
    { ID: 10, Name: 'Ahri' },
    { ID: 11, Name: 'Garen' },
    { ID: 12, Name: 'Lux' },
  ],
  Players: [
    { PUUID: 'p1', 'Game Name': 'One', Tagline: 'NA1' },
    { PUUID: 'p2', 'Game Name': 'Two', Tagline: '' },
    { PUUID: 'p3', 'Game Name': 'Three', Tagline: 'NA1' },
    { PUUID: 'p4', 'Game Name': 'Four', Tagline: 'NA1' },
  ],
  Teams: [
    { ID: 'S1-T01', Name: 'Alpha', 'Player 1': 'p1' },
    { ID: 'S1-T02', Name: 'Bravo', 'Player 1': 'p2' },
    { ID: 'S1-T03', Name: 'Charlie', 'Player 1': 'p3' },
    { ID: 'S2-T01', Name: 'Delta', 'Player 1': 'p1', 'Sub 1': 'p4' },
    { ID: 'S2-T02', Name: 'Echo' },
  ],
  Matches: [
    { Round: 1, 'Blue Team ID': 'S1-T01', 'Red Team ID': 'S1-T02', 'Game ID': 'G1', Winner: 'S1-T01', Duration: 1800 },
    { Round: 1, 'Blue Team ID': 'S1-T03', 'Red Team ID': 'S1-T01', 'Game ID': 'FORFEIT-1', Winner: 'S1-T03' },
    { Round: 2, 'Blue Team ID': 'S1-T02', 'Red Team ID': 'S1-T03', 'Game ID': 'G2', Winner: '' },
    { Round: 1, 'Blue Team ID': 'S2-T01', 'Red Team ID': 'S2-T02', 'Game ID': 'G3', Winner: 'S2-T02', Duration: 1500 },
  ],
  MatchTeams: [
    { 'Game ID': 'G1', 'Team ID': 'S1-T01', 'Ban 1': 12, Kills: 10 },
    { 'Game ID': 'G1', 'Team ID': 'S1-T02', 'Ban 1': 12, Kills: 4 },
  ],
  MatchParticipants: [
    { 'Game ID': 'G1', 'Team ID': 'S1-T01', PUUID: 'p1', Champion: 10, Position: 'middle', Kills: 6, Deaths: 1, Assists: 3, Gold: 12000 },
    { 'Game ID': 'G1', 'Team ID': 'S1-T02', PUUID: 'p2', Champion: 11, Position: 'TOP', Kills: 2, Deaths: 6, Assists: 1 },
    { 'Game ID': 'G3', 'Team ID': 'S2-T01', PUUID: 'p9', Champion: 10, Position: 'MIDDLE', Kills: 0, Deaths: 3, Assists: 0 },
  ],
}

test('groups teams and matches by the season in their team IDs, newest first', () => {
  const league = buildLeague(database)
  assert.deepEqual(league.seasons.map((season) => season.key), ['2', '1'])
  assert.equal(league.latest?.key, '2')
  assert.deepEqual(league.season('1')?.matches.map((match) => match.id), ['G1', 'FORFEIT-1', 'G2'])
  assert.deepEqual(league.playerSeasons('p1').map((entry) => entry.seasonKey), ['2', '1'])
})

test('ranks standings by record, counting forfeits as results', () => {
  const season = buildLeague(database).season('1')!
  assert.deepEqual(
    season.teams.map((team) => [team.name, team.rank, `${team.wins}-${team.losses}`]),
    [
      ['Charlie', 1, '1-0'],
      ['Alpha', 2, '1-1'],
      ['Bravo', 3, '0-1'],
    ],
  )
  assert.equal(season.team('S1-T03')?.forfeitWins, 1)
  assert.equal(season.team('S1-T01')?.forfeitLosses, 1)
  assert.equal(season.team('S1-T01')?.killDiff, 6)
})

test('summarizes only played, non-forfeit games', () => {
  const { summary } = buildLeague(database).season('1')!
  assert.equal(summary.matches, 3)
  assert.equal(summary.forfeits, 1)
  assert.equal(summary.decided, 2)
  assert.equal(summary.pending, 1)
  assert.equal(summary.played, 1)
  assert.equal(summary.blueWins, 1)
  assert.equal(summary.kills.sum, 14)
})

test('counts a champion once per game for presence, whether picked or banned', () => {
  const season = buildLeague(database).season('1')!
  const lux = season.champion(12)!
  assert.equal(lux.name, 'Lux')
  assert.equal(lux.bans, 2)
  assert.equal(lux.picks, 0)
  assert.equal(lux.presence, 1)
  assert.equal(season.champion(10)?.totals.wins, 1)
  assert.equal(season.playerSeason('p1')?.participations[0].position, 'MIDDLE')
})

test('keeps unlinked rows visible and reports them as issues', () => {
  const league = buildLeague(database)
  const delta = league.season('2')!.team('S2-T01')!
  assert.equal(delta.roster.find((slot) => slot.sub)?.player.name, 'Four')
  assert.equal(league.season('2')!.playerSeason('p9')?.player.name, 'Unknown player')
  assert.ok(league.issues.some((issue) => issue.includes('p9')))
})

test('totals team gold per game from participants, skipping games without data', () => {
  const alpha = buildLeague(database).season('1')!.team('S1-T01')!
  assert.deepEqual([alpha.gold.sum, alpha.gold.count], [12000, 1])
})

test('counts whole days until a date-only season start in local time', () => {
  const now = new Date(2026, 0, 1, 18, 30).getTime()
  assert.equal(daysUntil('2026-01-01', now), 0)
  assert.equal(daysUntil('2026-01-11', now), 10)
  assert.equal(daysUntil('2025-12-31', now), null)
  assert.equal(daysUntil(null, now), null)
})