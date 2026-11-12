# Google Apps Script

Source for the Apps Script project bound to the club's Google Sheet. This folder
is **not** part of the website: Vite doesn't build it, and it is never
deployed to GitHub Pages. Don't move it into `public/`, because everything in
`public/` is published on the site.

## Updating the script

These files are the source of truth. After changing them, copy each file's
contents into the matching file in the Apps Script editor
(**Extensions > Apps Script** from the sheet). Files here use `.js` so editors
and linters understand them; the editor names them `.gs`, which is the same
language.

If you change `doGet`, create a new version of the Web App deployment
(**Deploy > Manage deployments > Edit > New version**), otherwise the live
endpoint keeps serving the old code.

## Files

- [Code.js](Code.js): `doGet` Web App endpoint returning the public tabs as JSON.

## Security

This repository is public, so this code is public too.

- Never put the Riot API key in these files or in sheet cells. Store it in
  **Project Settings > Script Properties** and read it with
  `PropertiesService.getScriptProperties()`.
- `doGet` returns only the tabs listed in `PUBLIC_TABS`. Never let request
  parameters choose which tab or range is returned.
- Treat every column in a published tab as public.
