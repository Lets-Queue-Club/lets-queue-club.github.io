/**
 * Read-only JSON endpoint for the website.
 *
 * Deploy as a Web App (Execute as: Me, Who has access: Anyone). Everything
 * Every structured table is public except the columns excluded below.
 */
const EXCLUDED_TABLE_COLUMNS = [
  { table: 'Players', column: 'Discord' },
]

function doGet() {
  const spreadsheetId = getSpreadsheet().getId()
  const { sheets = [] } = Sheets.Spreadsheets.get(spreadsheetId, {
    fields: 'sheets(properties(title),tables(name,range,columnProperties))',
  })
  const tables = sheets.flatMap((sheet) =>
    (sheet.tables ?? []).map((table) => ({
      ...table,
      a1Range: toA1Range(sheet.properties.title, table.range),
      publicColumns: getPublicColumns(table),
    })),
  )

  let payload = {}
  if (tables.length > 0) {
    const { valueRanges } = Sheets.Spreadsheets.Values.batchGet(spreadsheetId, {
      ranges: tables.map((table) => table.a1Range),
      majorDimension: 'ROWS',
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER',
    })
    if (!valueRanges || valueRanges.length !== tables.length) {
      throw new Error('Sheets API did not return every requested table range.')
    }

    payload = Object.fromEntries(
      tables.map((table, index) => [
        table.name,
        readTableRows(valueRanges[index].values ?? [], table.publicColumns),
      ]),
    )
  }

  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  )
}

function getPublicColumns(table) {
  const columns = table.columnProperties ?? []
  const width = table.range.endColumnIndex - (table.range.startColumnIndex ?? 0)
  const names = new Set()
  const indices = new Set()
  if (columns.length !== width) {
    throw new Error(`Incomplete column metadata for table "${table.name}".`)
  }

  for (const column of columns) {
    const index = column.columnIndex ?? 0
    if (
      !column.columnName ||
      names.has(column.columnName) ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= width ||
      indices.has(index)
    ) {
      throw new Error(`Invalid column metadata for table "${table.name}".`)
    }
    names.add(column.columnName)
    indices.add(index)
  }

  return columns.filter(
    (column) => !EXCLUDED_TABLE_COLUMNS.some(
      (excluded) => excluded.table === table.name &&
        excluded.column === column.columnName,
    ),
  )
}

function readTableRows(values, columns) {
  // Read only the table's body; names come from table metadata, not cell headers.
  return values.slice(1).map((row) =>
    Object.fromEntries(
      columns.map((column) => [
        column.columnName,
        row[column.columnIndex ?? 0] ?? '',
      ]),
    ),
  ).filter(
    (row) => Object.values(row).some((value) => value !== ''),
  )
}
