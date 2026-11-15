# Let's Queue Club

A React + TypeScript site built with Vite and hosted on GitHub Pages. It shows
standings, matches, teams, players, champions, and records for every Let's Queue
Club season, read live from the club's Google Sheet.

## Local development

Use Node.js 24 (see [.nvmrc](.nvmrc)) and npm.

```sh
npm ci
npm run dev
```

- `npm run lint` checks the source with Oxlint.
- `npm run build` type-checks with TypeScript and produces the static site in `dist/`.
- `npm run preview` serves the production build locally after building.
- `npm run test:site` tests the data model that links and aggregates the sheet tables.

## Site structure

- `src/data/` fetches the sheet's JSON endpoint ([source.ts](src/data/source.ts),
  overridable with `VITE_DATA_URL`) and builds a linked, season-grouped model
  ([model.ts](src/data/model.ts)). The model has no React or Vite dependencies so
  it can be tested directly with Node.
- **Seasons** aren't a column yet: a team's season comes from its ID prefix
  (`S2-T01` → Season 2) and a match belongs to its teams' season. Teams without a
  prefix land in an "Other" season. Game IDs starting with `FORFEIT-` are
  forfeits: they count in standings but not in game stats.
- Every view is grouped by season first: `#/seasons/<n>/` has overview,
  standings, matches, teams, players, champions, and records pages, plus detail
  pages for a match, team, player, or champion.
- Responses are cached in `localStorage` and shown immediately on the next visit
  while fresh data loads. Champion names and art come from Riot's public Data
  Dragon CDN.
- The theme lives in [src/index.css](src/index.css) (color tokens) and
  [src/styles/](src/styles/).

## GitHub Pages strategy

This repository belongs to `Lets-Queue-Club` and is named
`lets-queue-club.github.io`, so it is an **organization site** published at
<https://lets-queue-club.github.io/>. GitHub Pages can serve React's compiled
HTML, CSS, and JavaScript, but cannot run Node.js or a backend.

- **Asset paths:** [vite.config.ts](vite.config.ts) sets `base: '/'` for this
  root-domain site. A project site at `https://<owner>.github.io/<repo>/` would
  instead need `base: '/<repo>/'`. Imported assets are processed by Vite; public
  assets in HTML use `%BASE_URL%`, and future public assets in React should use
  `import.meta.env.BASE_URL`.
- **Build and deploy:** [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
  runs `npm ci`, lint, the data-model tests, and the production build. Pushes to `main` upload only
  `dist/` as a Pages artifact and deploy using GitHub's official Pages actions.
  Pull requests run the same checks without deploying. Manual deployments are
  available from the Actions tab on `main`.
- **Permissions:** Only the deployment job receives `pages: write` and
  `id-token: write`; it depends on a successful build and uses the `github-pages`
  environment. The artifact workflow bypasses Jekyll, so no `gh-pages` branch or
  `.nojekyll` file is necessary.
- **Navigation:** Pages has no SPA rewrite rule, so refreshing a nested path
  such as `/standings` would return 404. The site uses hash routing instead
  (`/#/seasons/2/standings`), which keeps every deep link refreshable and
  shareable.
- **Data:** The site reads the Google Sheet through the public Apps Script web
  app, which returns every structured table as JSON with cross-origin access
  allowed and excludes private columns such as Discord names. The app is
  read-only. Keep Riot credentials and private Google credentials in a
  separate updater/backend, never in the browser bundle or `VITE_*` variables.
- **Apps Script:** The Google Apps Script source lives in
  [apps-script/](apps-script/). Vite doesn't build it and it isn't deployed;
  it is pushed and deployed with clasp (`npm run gas:push`; see its README).

### Publishing

The repository is public and **Settings > Pages > Build and deployment > Source**
is set to **GitHub Actions**. Every push to `main` builds and publishes the site
to <https://lets-queue-club.github.io/> automatically. Keep `dist/` and
`node_modules/` out of git.

Because the repository is public, never commit secrets: `.env` files and clasp
credentials (`.clasprc.json`) are ignored by [.gitignore](.gitignore). A secret
that is ever committed must be revoked, since it remains in git history.

### Research references

- [Vite: deploying to GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages)
- [GitHub: Pages site types and static hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub: custom Pages workflows and required permissions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)