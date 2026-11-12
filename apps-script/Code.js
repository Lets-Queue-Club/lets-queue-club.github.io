/**
 * Read-only JSON endpoint for the website.
 *
 * Deploy as a Web App (Execute as: Me, Who has access: Anyone). Everything
 * returned here is public, so only list tabs that are safe to publish.
 */
const PUBLIC_TABS = {
  standings: 'Standings',
  playerStats: 'PlayerStats',
}

function doGet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  const payload = {}

  for (const [key, tabName] of Object.entries(PUBLIC_TABS)) {
    payload[key] = readTab(spreadsheet, tabName)
  }

  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  )
}

function readTab(spreadsheet, tabName) {
  const sheet = spreadsheet.getSheetByName(tabName)
  if (!sheet) {
    return []
  }

  const [headers = [], ...rows] = sheet.getDataRange().getValues()
  return rows.map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index]])),
  )
}
