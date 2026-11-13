# Google Apps Script

Source for the Apps Script project bound to the club's Google Sheet. This folder
is **not** part of the website: Vite doesn't build it, and it is never
deployed to GitHub Pages. Don't move it into `public/`, because everything in
`public/` is published on the site.

These files are the source of truth, synced with [clasp](https://github.com/google/clasp)
(installed as a dev dependency). [.clasp.json](../.clasp.json) points clasp at
this folder; only `appsscript.json`, `.js`, `.gs`, and `.html` files are
pushed. Files use `.js` locally; Apps Script shows them as `.gs`.

## Commands

Run from the repository root:

| Command | What it does |
|---|---|
| `npm run gas:deploy -- "<description>"` | Pushes, then publishes a new version to the live Web App deployment, keeping its URL. The description is optional; it defaults to a timestamp. |
| `npm run gas:push` | Replaces the Apps Script project's files and manifest with this folder, without changing the live Web App. Edits made only in the online editor are overwritten. |
| `npm run gas:describe` | Runs `describeDatabaseStructure` and prints the tables and columns as JSON. Runs the latest pushed code. |
| `npm run test:gas` | Tests the public endpoint locally using mocked Google services; does not read or change the live sheet. |

The live Web App is
<https://script.google.com/macros/s/AKfycbyxm5Teyjm5D8H76veSq1gUwa2nR2362RIKVoMQNYDh7gImcUTcYzLO47X_wGG9V-_z5g/exec>.
Its deployment ID is set in
[scripts/deploy-apps-script.mjs](../scripts/deploy-apps-script.mjs). Never run
`npx clasp deploy` without `-i`: that creates a new deployment with a different
URL.

## One-time setup

`clasp run` needs your own Google Cloud project and OAuth client. Pushing and
deploying alone only need steps 1, 2, and 6 (plain `npx clasp login`).

1. Turn on the Apps Script API at <https://script.google.com/home/usersettings>.
2. Set `scriptId` in [.clasp.json](../.clasp.json) to the ID from the Apps
   Script editor's **Project Settings**. It isn't secret.
3. Create a standard [Google Cloud project](https://console.cloud.google.com/projectcreate)
   and configure its **OAuth consent screen** (Internal or External; for
   External, add yourself as a test user). Enable the **Apps Script API** and
   **Google Sheets API** in the project.
4. In the Apps Script editor, open **Project Settings > Google Cloud Platform
   (GCP) Project > Change project** and enter the Cloud project's number.
5. In the Cloud project, create an OAuth client ID of type **Desktop app**,
   download it, and save it in the repository root as `client_secret.json`.
   It is git-ignored; never commit it.
6. Push the code (this also uploads the manifest's scopes, Sheets service, and
   API access settings):

   ```sh
   npx clasp login
   npm run gas:push
   ```

7. Log in again with the client and the manifest's scopes so `clasp run` can
   execute functions as you:

   ```sh
   npx clasp login --creds client_secret.json --use-project-scopes --include-clasp-scopes
   ```

8. If `gas:describe` reports that the script isn't deployed as an API
   executable, add one under **Deploy > New deployment > API Executable** in
   the editor. Leave the existing Web App deployment as is.

If `doGet` or `describeDatabaseStructure` reports that no spreadsheet is active,
add a script property named `SPREADSHEET_ID` containing the sheet's ID (from its URL).

## Files

- [appsscript.json](appsscript.json): manifest. Enables the Sheets advanced
  service (needed to read tables), requests spreadsheet access, makes the Web
  App public and anonymous, and allows only you to run functions through the API.
- [Code.js](Code.js): `doGet` Web App endpoint returning structured tables as JSON.
- [Tools.js](Tools.js): `describeDatabaseStructure` returns every structured
  table's name, sheet, range, data row count, and column names and types,
  including allowed dropdown values. It never reads cell values. It also lists
  `sheetsWithoutTables` so data outside tables is easy to spot.

## Public endpoint

`doGet` discovers all structured tables, regardless of which tabs contain them,
and returns one JSON object keyed by table name. Each value is an array of row
objects keyed by the table's column names, for example:

```json
{
  "Teams": [{ "ID": 1, "Name": "Example team" }],
  "Players": [{ "PUUID": "example-id", "Game Name": "Example", "Tagline": "NA1" }]
}
```

Only cells inside each table's range are read. Headers are not returned as rows.
Blank rows (including rows with only excluded values) are omitted; missing cells
in otherwise populated rows become `""`. Empty tables return `[]`. Numbers and
booleans retain their types; dates, times, and durations use Sheets serial numbers,
not formatted strings or ISO timestamps.

The endpoint makes one table-metadata request and one batched values request.
These are separate reads, not an atomic transaction; avoid changing table
structure during a fetch. Query parameters do not select tables or ranges.

One response is simplest for the current site. If payload size becomes a problem,
add selective fetching or pagination. Later, computed views such as standings
can answer specific UI questions without replacing this basic table export.

### Excluding columns

Edit `EXCLUDED_TABLE_COLUMNS` in [Code.js](Code.js). Each definition names a
table and one column to omit from every exported row:

```js
const EXCLUDED_TABLE_COLUMNS = [
  { table: 'Players', column: 'Discord' },
]
```

Names match exactly and are case-sensitive. Update exclusions when renaming a
table or column. All other tables and columns, including newly added ones, are
public automatically; never store secrets in structured tables in this spreadsheet.
This is an exclusion list, not a private-data allowlist.

### Table growth

Prefer tables sized to their actual records; future import code should expand
their table ranges as it appends data. Reserved blank rows also work, since the
endpoint skips them, but make capacity counts less useful and can increase the
amount of data scanned. No existing ranges are resized by this endpoint.

## Database structure

Snapshot of `describeDatabaseStructure` output, taken 2026-11-12. The live
sheet may have changed since; replace this section when new output is
available. All data lives in structured tables; the header row of each table is
row 2 of its tab.

Every column currently has no type set (`COLUMN_TYPE_UNSPECIFIED`). Ranges
include empty rows reserved in the table, so the range sizes and "rows reserved"
counts are not the number of filled rows.

| Table | Tab | Range | Rows reserved | Columns |
|---|---|---|---|---|
| `Teams` | Teams Table | `A2:L101` | 99 | ID, Name, Player 1, Player 2, Player 3, Player 4, Player 5, Sub 1, Sub 2, Sub 3, Sub 4, Sub 5 |
| `Players` | Players Table | `A2:D1001` | 999 | PUUID, Game Name, Tagline, Discord |
| `Matches` | Matches Table | `A2:H5000` | 4998 | Round, Blue Team ID, Red Team ID, Tournament Code, Game ID, Winner, Start Timestamp, Duration |
| `MatchTeams` | Match Teams Table | `A2:O5000` | 4998 | Game ID, Team ID, Ban 1, Ban 2, Ban 3, Ban 4, Ban 5, First Blood, Kills, Towers, Inhibitors, Dragons, Void Grubs, Rift Herald, Barons |
| `MatchParticipants` | Match Participants Table | `A2:N27` | 25 | Column 1 to Column 14 (placeholder names; not yet defined) |
| `Champions` | Champions Table | `A2:B1000` | 998 | ID, Name |

Tabs without tables: `Schema Plan`, `Constants`.

Table IDs (stable even if a table is renamed): `Teams` 147166511, `Players`
1426353351, `Matches` 645528010, `MatchTeams` 856360441, `MatchParticipants`
148750668, `Champions` 1718741196.

## Security

This repository is public, so this code is public too.

- Never put the Riot API key in these files or in sheet cells. Store it in
  **Project Settings > Script Properties** and read it with
  `PropertiesService.getScriptProperties()`.
- `client_secret.json` and `.clasprc.json` (clasp's login tokens) are
  git-ignored. If either is ever committed, revoke and replace it.
- `executionApi.access` is `MYSELF`, so only you can run functions through
  `clasp run`. Don't change it to `ANYONE`.
- `doGet` publishes every structured table, excluding only columns defined in
  `EXCLUDED_TABLE_COLUMNS` (currently `Players.Discord`). Tabs without tables
  are not exported. Never let request parameters override these exclusions.
- Treat every non-excluded column in every structured table as public.
