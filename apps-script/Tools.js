/**
 * Describes every structured table in the spreadsheet: its name, location,
 * row count, and typed columns. Cell values are never included.
 *
 * Run with `npm run gas:describe` (clasp run) or from the Apps Script editor.
 * Also lists tabs that contain no tables, to catch data living outside them.
 */
function describeDatabaseStructure() {
  const spreadsheetId = getSpreadsheet().getId()
  const { sheets = [] } = Sheets.Spreadsheets.get(spreadsheetId, {
    fields:
      'sheets(properties(title),tables(tableId,name,range,columnProperties))',
  })

  const tables = []
  const sheetsWithoutTables = []

  for (const sheet of sheets) {
    const sheetName = sheet.properties.title
    const sheetTables = sheet.tables ?? []
    if (sheetTables.length === 0) {
      sheetsWithoutTables.push(sheetName)
    }

    for (const table of sheetTables) {
      tables.push({
        name: table.name,
        tableId: table.tableId,
        sheet: sheetName,
        range: toA1Range(sheetName, table.range),
        dataRowCount: countDataRows(table.range),
        columns: (table.columnProperties ?? []).map((column) => ({
          name: column.columnName,
          type: column.columnType ?? 'COLUMN_TYPE_UNSPECIFIED',
          ...(column.dataValidationRule && {
            allowedValues: getDropdownValues(column.dataValidationRule),
          }),
        })),
      })
    }
  }

  const structure = { tables, sheetsWithoutTables }
  console.log(JSON.stringify(structure, null, 2))
  return structure
}

function getSpreadsheet() {
  const active = SpreadsheetApp.getActiveSpreadsheet()
  if (active) {
    return active
  }

  // Fallback if no active spreadsheet is available when run through the API.
  const spreadsheetId =
    PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  if (!spreadsheetId) {
    throw new Error(
      'No active spreadsheet. Set the SPREADSHEET_ID script property.',
    )
  }
  return SpreadsheetApp.openById(spreadsheetId)
}

function countDataRows(range) {
  const rowCount = range.endRowIndex - (range.startRowIndex ?? 0)
  return Math.max(rowCount - 1, 0)
}

function getDropdownValues(rule) {
  return (rule.condition?.values ?? []).map((value) => value.userEnteredValue)
}

function toA1Range(sheetName, range) {
  const start = `${toColumnLetter(range.startColumnIndex ?? 0)}${(range.startRowIndex ?? 0) + 1}`
  const end = `${toColumnLetter(range.endColumnIndex - 1)}${range.endRowIndex}`
  return `'${sheetName.replaceAll("'", "''")}'!${start}:${end}`
}

function toColumnLetter(index) {
  let letters = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters
  }
  return letters
}
