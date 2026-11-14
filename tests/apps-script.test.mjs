import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createContext, runInContext } from 'node:vm'

const source = ['Tools.js', 'Code.js', 'Import.js', 'Champions.js'].map((name) =>
  readFileSync(new URL(`../apps-script/${name}`, import.meta.url), 'utf8'),
).join('\n')

function endpoint(sheets, valueRanges) {
  const requests = []
  const context = createContext({
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({ getId: () => 'test-spreadsheet' }),
    },
    Sheets: {
      Spreadsheets: {
        get: () => ({ sheets }),
        Values: {
          batchGet: (id, options) => {
            requests.push({ id, ...options })
            return { valueRanges }
          },
        },
      },
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (body) => ({
        setMimeType: (mimeType) => ({ body, mimeType }),
      }),
    },
  })
  runInContext(source, context)
  return {
    requests,
    run: () => {
      const { body, mimeType } = runInContext('doGet()', context)
      assert.equal(mimeType, 'application/json')
      return JSON.parse(body)
    },
  }
}

function table(name, columns, range = {}) {
  return {
    name,
    range: {
      startRowIndex: 1,
      endRowIndex: 10,
      endColumnIndex: columns.length,
      ...range,
    },
    columnProperties: columns.map((columnName, columnIndex) => ({
      columnName, columnIndex,
    })),
  }
}

test('discovers tables, uses their bounds and column indices, and omits Discord', () => {
  const players = table('Players', ['PUUID', 'Game Name', 'Discord'], {
    startColumnIndex: 2, endColumnIndex: 5,
  })
  // The API may omit a zero index; metadata order need not match column order.
  delete players.columnProperties[0].columnIndex
  players.columnProperties.reverse()
  const app = endpoint([
    {
      properties: { title: "Club's Data" },
      tables: [
        players,
        table('Teams', ['ID', 'Name'], {
          startRowIndex: 12, endRowIndex: 20,
          startColumnIndex: 26, endColumnIndex: 28,
        }),
      ],
    },
    { properties: { title: 'Constants' } },
    {
      properties: { title: 'Participants' },
      tables: [table('MatchParticipants', ['Column 1', 'Column 2'])],
    },
  ], [
    { values: [['PUUID', 'Game Name', 'Discord'], ['player-1', 'Example', 'private']] },
    { values: [['ID', 'Name'], [1, 'Example team']] },
    { values: [['Column 1', 'Column 2'], ['placeholder', 2]] },
  ])

  assert.deepEqual(app.run(), {
    Players: [{ PUUID: 'player-1', 'Game Name': 'Example' }],
    Teams: [{ ID: 1, Name: 'Example team' }],
    MatchParticipants: [{ 'Column 1': 'placeholder', 'Column 2': 2 }],
  })
  assert.equal(app.requests.length, 1)
  assert.deepEqual(Array.from(app.requests[0].ranges), [
    "'Club''s Data'!C2:E10", "'Club''s Data'!AA13:AB20", "'Participants'!A2:B10",
  ])
  assert.equal(app.requests[0].majorDimension, 'ROWS')
  assert.equal(app.requests[0].valueRenderOption, 'UNFORMATTED_VALUE')
})

test('omits blank and private-only rows, preserves zero/false, and fills sparse cells', () => {
  const app = endpoint([{
    properties: { title: 'Data' },
    tables: [
      table('Players', ['PUUID', 'Game Name', 'Discord']),
      table('Stats', ['Count', 'Enabled', 'Note']),
      table('Empty', ['ID']),
    ],
  }], [
    { values: [['PUUID', 'Game Name', 'Discord'], [], ['', '', 'private']] },
    { values: [['Count', 'Enabled', 'Note'], [0, false], ['', '', ''], []] },
    {},
  ])
  assert.deepEqual(app.run(), {
    Players: [],
    Stats: [{ Count: 0, Enabled: false, Note: '' }],
    Empty: [],
  })
})

test('returns an empty object without requesting values when there are no tables', () => {
  const app = endpoint([{ properties: { title: 'Notes' } }], [])
  assert.deepEqual(app.run(), {})
  assert.equal(app.requests.length, 0)
})

test('surfaces incomplete column metadata and missing API ranges as errors', () => {
  const invalid = table('Players', ['PUUID', 'Discord'])
  invalid.columnProperties.pop()
  const metadataApp = endpoint([{
    properties: { title: 'Data' }, tables: [invalid],
  }], [])
  assert.throws(metadataApp.run, /Incomplete column metadata/)
  assert.equal(metadataApp.requests.length, 0)

  const rangeApp = endpoint([{
    properties: { title: 'Data' }, tables: [table('Teams', ['ID'])],
  }], [])
  assert.throws(rangeApp.run, /did not return every requested table range/)
})

function importer(sheets, valueRanges, data, { status = 200 } = {}) {
  const calls = { batchUpdate: [], batchGet: [], fetched: [], lock: [] }
  const context = createContext({
    console: { log: () => {} },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({ getId: () => 'test-spreadsheet' }),
    },
    LockService: {
      getScriptLock: () => ({
        waitLock: () => calls.lock.push('wait'),
        releaseLock: () => calls.lock.push('release'),
      }),
    },
    UrlFetchApp: {
      fetch: (url) => {
        calls.fetched.push(url)
        return {
          getResponseCode: () => status,
          getContentText: () => JSON.stringify(data),
        }
      },
    },
    Sheets: {
      Spreadsheets: {
        get: () => ({ sheets }),
        batchUpdate: (body, id) => calls.batchUpdate.push({ body: JSON.parse(JSON.stringify(body)), id }),
        Values: {
          batchGet: (id, options) => {
            calls.batchGet.push(options)
            return { valueRanges }
          },
        },
      },
    },
  })
  runInContext(source, context)
  return {
    calls,
    run: (dryRun) =>
      JSON.parse(JSON.stringify(runInContext(
        `importSeasonData('https://example.test/season.json', { dryRun: ${dryRun} })`,
        context,
      ))),
  }
}

function seasonData(tables) {
  return {
    format: 'lets-queue-club.season-import',
    formatVersion: 1,
    season: 2,
    tableColumns: Object.fromEntries(
      Object.entries(tables).map(([name, rows]) => [name, Object.keys(rows[0])]),
    ),
    tables,
  }
}

test('importer appends only new rows, mapped to live columns by name', () => {
  const players = table('Players', ['Tagline', 'Discord', 'PUUID', 'Game Name'])
  players.tableId = 'players-table'
  const champions = table('Champions', ['ID', 'Name'])
  champions.tableId = 'champions-table'
  const data = seasonData({
    Players: [
      { PUUID: 'FAKE-1', 'Game Name': 'One', Tagline: '0001' },
      { PUUID: 'FAKE-2', 'Game Name': 'Two', Tagline: '' },
    ],
    Champions: [{ ID: 1, Name: 'Annie' }],
  })
  const app = importer([{ properties: { title: 'Data' }, tables: [players, champions] }], [
    { values: [['Tagline', 'Discord', 'PUUID', 'Game Name'], ['', 'me', 'FAKE-1', 'One'], []] },
    { values: [['ID', 'Name'], [1, 'Annie']] },
  ], data)

  const preview = app.run(true)
  assert.deepEqual(preview.tables, [
    { name: 'Players', imported: 2, added: 1, skipped: 1 },
    { name: 'Champions', imported: 1, added: 0, skipped: 1 },
  ])
  assert.equal(app.calls.batchUpdate.length, 0)

  app.run(false)
  assert.equal(app.calls.batchUpdate.length, 1)
  const { requests } = app.calls.batchUpdate[0].body
  assert.deepEqual(requests, [{
    appendCells: {
      tableId: 'players-table',
      fields: 'userEnteredValue',
      rows: [{
        values: [
          {},
          {},
          { userEnteredValue: { stringValue: 'FAKE-2' } },
          { userEnteredValue: { stringValue: 'Two' } },
        ],
      }],
    },
  }])
  assert.deepEqual(app.calls.lock, ['wait', 'release', 'wait', 'release'])
})

test('importer writes numbers as numbers and keeps numeric-looking text as text', () => {
  const matches = table('Matches', ['Game ID', 'Duration', 'Tagline'])
  matches.tableId = 'matches-table'
  const app = importer([{ properties: { title: 'Data' }, tables: [matches] }], [
    { values: [['Game ID', 'Duration', 'Tagline']] },
  ], seasonData({ Matches: [{ 'Game ID': 'G1', Duration: 0, Tagline: '123' }] }))
  app.run(false)
  assert.deepEqual(app.calls.batchUpdate[0].body.requests[0].appendCells.rows[0].values, [
    { userEnteredValue: { stringValue: 'G1' } },
    { userEnteredValue: { numberValue: 0 } },
    { userEnteredValue: { stringValue: '123' } },
  ])
})

test('importer aborts before reading or writing when tables or columns do not match', () => {
  const participants = table('MatchParticipants', ['Column 1', 'Column 2'])
  const app = importer([{ properties: { title: 'Data' }, tables: [participants] }], [], seasonData({
    MatchParticipants: [{ 'Game ID': 'G1', PUUID: 'P1' }],
    Teams: [{ ID: 1 }],
  }))
  assert.throws(() => app.run(false), (error) =>
    /nothing was written/.test(error.message) &&
    /MatchParticipants" is missing columns: Game ID, PUUID/.test(error.message) &&
    /Table "Teams" does not exist/.test(error.message))
  assert.equal(app.calls.batchGet.length, 0)
  assert.equal(app.calls.batchUpdate.length, 0)
  assert.deepEqual(app.calls.lock, ['wait', 'release'])
})

test('importer rejects failed downloads and unknown file formats', () => {
  const failed = importer([], [], seasonData({ Teams: [{ ID: 1 }] }), { status: 404 })
  assert.throws(() => failed.run(true), /HTTP 404/)

  const wrongFormat = importer([], [], { format: 'other', tables: {} })
  assert.throws(() => wrongFormat.run(true), /Unsupported import file/)
})

test('refreshChampions appends new champions, renames changed ones, and never deletes', () => {
  const champions = table('Champions', ['Name', 'ID'], { startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 3, endColumnIndex: 5 })
  champions.tableId = 'champions-table'
  const updates = []
  const fetched = []
  const context = createContext({
    console: { log: () => {} },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getId: () => 'test-spreadsheet' }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    UrlFetchApp: {
      fetch: (url) => {
        fetched.push(url)
        const body = url.endsWith('versions.json')
          ? ['99.1.1', '99.1.0']
          : { data: { Annie: { key: '1', name: 'Annie' }, Wukong: { key: '62', name: 'Wukong' }, Mel: { key: '800', name: 'Mel' } } }
        return { getResponseCode: () => 200, getContentText: () => JSON.stringify(body) }
      },
    },
    Sheets: {
      Spreadsheets: {
        get: () => ({ sheets: [{ properties: { title: 'Champions Table', sheetId: 7 }, tables: [champions] }] }),
        batchUpdate: (body) => updates.push(JSON.parse(JSON.stringify(body))),
        Values: {
          get: (id, range) => {
            assert.equal(range, "'Champions Table'!D2:E1000")
            return { values: [['Name', 'ID'], ['Annie', 1], ['MonkeyKing', 62], ['Retired', 999], []] }
          },
        },
      },
    },
  })
  runInContext(source, context)

  const preview = JSON.parse(JSON.stringify(runInContext('previewChampionsRefresh()', context)))
  assert.deepEqual(preview, {
    dryRun: true, version: '99.1.1', champions: 3,
    added: ['800 Mel'], renamed: [{ id: 62, from: 'MonkeyKing', to: 'Wukong' }], unchanged: 1,
  })
  assert.equal(updates.length, 0)
  assert.equal(fetched[1], 'https://ddragon.leagueoflegends.com/cdn/99.1.1/data/en_US/champion.json')

  runInContext('refreshChampions()', context)
  assert.deepEqual(updates[0].requests, [
    {
      updateCells: {
        start: { sheetId: 7, rowIndex: 3, columnIndex: 3 },
        rows: [{ values: [{ userEnteredValue: { stringValue: 'Wukong' } }] }],
        fields: 'userEnteredValue',
      },
    },
    {
      appendCells: {
        tableId: 'champions-table',
        rows: [{ values: [
          { userEnteredValue: { stringValue: 'Mel' } },
          { userEnteredValue: { numberValue: 800 } },
        ] }],
        fields: 'userEnteredValue',
      },
    },
  ])
})
