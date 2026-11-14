# Season 2 import data

`season-2.json` holds Season 2 converted into the database tables described in
[apps-script/README.md](../../apps-script/README.md#database-structure).
`importSeason2` in [Import.js](../../apps-script/Import.js) appends the
`tables.<Table>` rows to each structured table; see
[Importing season data](../../apps-script/README.md#importing-season-data).

Source: the public Season 2 sheet
(`1lJwH6ZA0KaB0wOxUEnEIyawmz7u55db6Wh0n4F9tVwQ`). Snapshots of its tabs are in
[`source/`](source/), together with Riot Data Dragon champion data.

## Regenerating

```powershell
npm run data:season-2
```

This runs [`scripts/build-season-2-data.mjs`](../../scripts/build-season-2-data.mjs),
which reads `source/` and [`curation.json`](curation.json) and rewrites
`season-2.json`. Don't edit `season-2.json` by hand. Put fixes in
`curation.json` (every entry has a `reason`), or refresh `source/` from the sheet.

## Top-level keys

| Key | Contents |
|---|---|
| `tableColumns` | Column order used for each table. |
| `tables` | Rows to insert, keyed by table name and column header. Fully linked: every ID points at an existing row. |
| `fakeValues` | Descriptions of the invented ID patterns and of blank (`""`) values. |
| `lookups` | One entry per invented ID: what the source knows and how to find the real value. |
| `assumptions` | Every guess made to link the data (who played, inferred winners). |
| `conventions` | IDs, units, and assumptions. |
| `supplemental` | Data with no column yet: divisions and source standings, team OP.GG links and roster hints, free agents, unplayed matches, raw per-team picks/bans/gold/CS/damage, and broadcasts. |
| `issues` | Inconsistencies found in the source, each with the cell it came from. |

## Invented IDs and blanks

The data set works as-is. Riot keys the source doesn't have are invented, and
the same invented ID is used everywhere, so joins work:

- `FAKE-PUUID-<player>`: a player's PUUID (Players, Teams player and sub columns,
  MatchParticipants).
- `FAKE-GAME-<match>`: a played match's Game ID (Matches, MatchTeams,
  MatchParticipants).
- `FORFEIT-<match>`: a forfeit's Game ID. Forfeits have no MatchTeams or
  MatchParticipants rows.

When the real value is known, replace the invented ID everywhere it appears.
Each one has an entry in `lookups` with the Riot ID (when known), the names it
appeared under, its teams, and which values are still `missing`.

Values the source doesn't have and that aren't keys are `""`. These include
Discord, 92 taglines, most tournament codes, Start Timestamp, a few durations,
First Blood, Inhibitors, Rift Herald, Barons, and any stats, bans or champions
that weren't recorded.

## Assumptions

Invented players and guessed links are listed in `assumptions`:

- `sub-slot-inferred`: when subs played, each sub replaces the slot whose stat
  line in that game looks least like that slot's regular starter. A sub is pushed
  toward a slot they share on this team or start in on another team. `surprise`
  shows the evidence; `0` means there was none and the slot is a guess.
- `shared-slot-primary`: a roster slot shared by two players is credited to the
  first one listed, unless the other is listed as a sub.
- `no-player-stats`: no player stats for the team that game, so the five
  starters are used.
- `placeholder-roster`: Team 39, Team 40 and 23 & Me have no roster in the
  source. Their Player 1–5 are invented players named `<team> Player <n>`.
- `WINNER`: two week 8 games have stats but no recorded winner. The winner is
  inferred from towers destroyed.

## Conventions

- Team IDs are `S2-T<nn>`; match keys are `S2-W<week>-M<nn>` (order within the
  week on the Schedule tab). `Round` is the week.
- Blue/Red are the first/second team on the schedule. The source does not record
  sides, so these are unverified.
- Player Stats columns 1–5 are treated as positions TOP, JUNGLE, MIDDLE, BOTTOM
  and UTILITY. The source lists team picks without pairing them to players, so
  pick n is assigned to the player in column n. Picks follow role order about 80%
  of the time (checked against Data Dragon support/marksman tags), so expect
  some champions on the wrong player.
- Bans and champions use numeric Data Dragon IDs. Duration is in seconds.
- `MatchParticipants` uses proposed columns (Game ID, Team ID, PUUID, Champion,
  Position, Kills, Deaths, Assists, CS, Damage, Gold). The live table still has
  placeholder column names, so update one or the other before importing.
- The Schedule tab is the authority for results. The Standings tab disagrees for
  two teams (see `issues`, category `standings`), and is internally unbalanced.
- Matches that were never played are not in `tables`; they are listed in
  `supplemental.unplayedMatches`.
