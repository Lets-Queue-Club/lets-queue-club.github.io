# Let's Queue Club

A React + TypeScript site built with Vite and hosted on GitHub Pages. Its landing
page introduces the club, and season pages show matches, teams, players,
champions, and records for every Let's Queue Club season, read live from the
club's Google Sheet.

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
  matches, teams (which include the standings), players, champions, and records
  pages, plus detail pages for a match, team, player, or champion.
- The landing page's next-season date, signup link, and events come from
  [src/club.ts](src/club.ts); edit that file to fill them in. It also holds the
  organizer contact (email or Discord invite) and the "last updated" date shown
  on the policy pages.
- `#/rules`, `#/privacy`, and `#/terms` are the league rules, privacy policy,
  and terms of use ([InfoPages.tsx](src/pages/InfoPages.tsx)), linked from the
  footer. `public/rules/`, `public/privacy/`, and `public/terms/` are tiny
  redirect pages, so clean URLs like `https://lets-queue-club.github.io/privacy`
  work in forms that don't accept `#` links.
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
  such as `/seasons/2/teams` would return 404. The site uses hash routing instead
  (`/#/seasons/2/teams`), which keeps every deep link refreshable and
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

## Riot API production key checklist

Tournament codes need the Tournament API, which Riot only grants to
**Production** keys. A Production key is approved per product, after review.

1. **Site verification:** after registering the product in the
   [Developer Portal](https://developer.riotgames.com/), copy the verification
   code from the app's page into [public/riot.txt](public/riot.txt), replacing
   the placeholder. Once deployed, it's served at
   <https://lets-queue-club.github.io/riot.txt>.
2. **Legal pages:** the privacy policy (`/privacy`), terms of use (`/terms`),
   and Riot's "isn't endorsed by Riot Games" notice (site footer) are in place.
   They're drafts written for this club; review them before applying, and set a
   real contact in `CLUB.contact` so players can make privacy requests.
3. **A finished product:** reviewers reject blank, placeholder, or "coming
   soon" sites. Keep the public rules, schedule, rosters, results, and stats up,
   and add the signup link (`CLUB.signupUrl`) when signups open.
4. **Tournament policy:** keep the league free with no gambling, publish the
   rules and win conditions, and meet Riot's minimum of 20 participants. If
   entry fees are ever added, at least 70% must go to the prize pool.
5. **Application:** describe the league and ask for Tournament API access
   explicitly. Reviews can take months.
6. **Callback URL:** registering a tournament provider needs an HTTPS URL that
   accepts Riot's POSTed game results. GitHub Pages can't receive POSTs. An
   Apps Script `doPost` web app might work, but Riot's callback client may not
   follow its redirect, so plan for a small backend if it doesn't. You can
   still poll results by tournament code without a callback.

References: [Developer Portal docs](https://developer.riotgames.com/docs/portal),
[General policies](https://developer.riotgames.com/policies/general),
[LoL Tournament API](https://developer.riotgames.com/docs/lol#riot-games-api_tournament-api),
and Riot developer-relations issues
[#1172](https://github.com/RiotGames/developer-relations/issues/1172) and
[#1190](https://github.com/RiotGames/developer-relations/issues/1190).
