import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createContext, runInContext } from 'node:vm'

const source = ['Tools.js', 'Code.js'].map((name) =>
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
