/**
 * Refreshes the Champions table (ID -> Name) from Riot's Data Dragon.
 *
 * New champions are appended and renamed ones are updated in place. Rows are
 * never deleted, so IDs referenced by past matches always resolve.
 * Run `previewChampionsRefresh` to see the changes without writing anything.
 */
const DATA_DRAGON_VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json'
const CHAMPIONS_TABLE = 'Champions'

function previewChampionsRefresh() {
  return refreshChampions({ dryRun: true })
}

function refreshChampions({ dryRun = false } = {}) {
  const lock = LockService.getScriptLock()
  lock.waitLock(30000)
  try {
    const { version, champions } = fetchDataDragonChampions()
    const spreadsheetId = getSpreadsheet().getId()
    const table = findTable(spreadsheetId, CHAMPIONS_TABLE)
    const idColumn = table.columns.get('ID')
    const nameColumn = table.columns.get('Name')
    if (idColumn === undefined || nameColumn === undefined) {
      throw new Error(`Table "${CHAMPIONS_TABLE}" needs "ID" and "Name" columns.`)
    }

    const { values = [] } = Sheets.Spreadsheets.Values.get(
      spreadsheetId,
      toA1Range(table.sheetTitle, table.range),
      { majorDimension: 'ROWS', valueRenderOption: 'UNFORMATTED_VALUE' },
    )
    const existing = new Map()
    values.slice(1).forEach((row, index) => {
      const id = row[idColumn]
      if (id !== '' && id !== undefined) existing.set(String(id), { name: row[nameColumn] ?? '', index })
    })

    const firstDataRow = (table.range.startRowIndex ?? 0) + 1
    const startColumn = table.range.startColumnIndex ?? 0
    const width = table.range.endColumnIndex - startColumn
    const renamed = []
    const added = []
    const requests = []
    for (const champion of champions) {
      const current = existing.get(String(champion.id))
      if (!current) {
        added.push(champion)
      } else if (current.name !== champion.name) {
        renamed.push({ id: champion.id, from: current.name, to: champion.name })
        requests.push({
          updateCells: {
            start: {
              sheetId: table.sheetId,
              rowIndex: firstDataRow + current.index,
              columnIndex: startColumn + nameColumn,
            },
            rows: [{ values: [toCellData(champion.name)] }],
            fields: 'userEnteredValue',
          },
        })
      }
    }
    if (added.length > 0) {
      requests.push({
        appendCells: {
          // The API rejects appendCells without a valid sheetId, even with tableId.
          sheetId: table.sheetId,
          tableId: table.tableId,
          rows: added.map((champion) => {
            const cells = Array.from({ length: width }, () => ({}))
            cells[idColumn] = toCellData(champion.id)
            cells[nameColumn] = toCellData(champion.name)
            return { values: cells }
          }),
          fields: 'userEnteredValue',
        },
      })
    }
    if (!dryRun && requests.length > 0) {
      batchUpdateSpreadsheet(spreadsheetId, requests)
    }

    const summary = {
      dryRun,
      version,
      champions: champions.length,
      added: added.map((champion) => `${champion.id} ${champion.name}`),
      renamed,
      unchanged: champions.length - added.length - renamed.length,
    }
    console.log(JSON.stringify(summary, null, 2))
    return summary
  } finally {
    lock.releaseLock()
  }
}

function fetchDataDragonChampions() {
  const [version] = fetchJson(DATA_DRAGON_VERSIONS_URL)
  const { data } = fetchJson(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`)
  // Data Dragon keys champions by name; the numeric ID used by match data is `key`.
  const champions = Object.values(data)
    .map((champion) => ({ id: Number(champion.key), name: champion.name }))
    .sort((a, b) => a.id - b.id)
  return { version, champions }
}

function fetchJson(url) {
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true })
  const status = response.getResponseCode()
  if (status !== 200) {
    throw new Error(`Downloading ${url} failed with HTTP ${status}.`)
  }
  return JSON.parse(response.getContentText())
}

function findTable(spreadsheetId, name) {
  const { sheets = [] } = Sheets.Spreadsheets.get(spreadsheetId, {
    fields: 'sheets(properties(title,sheetId),tables(tableId,name,range,columnProperties))',
  })
  for (const sheet of sheets) {
    const table = (sheet.tables ?? []).find((candidate) => candidate.name === name)
    if (table) {
      return {
        tableId: table.tableId,
        range: table.range,
        sheetId: sheet.properties.sheetId,
        sheetTitle: sheet.properties.title,
        columns: new Map(
          (table.columnProperties ?? []).map((column) => [column.columnName, column.columnIndex ?? 0]),
        ),
      }
    }
  }
  throw new Error(`Table "${name}" does not exist in the spreadsheet.`)
}
