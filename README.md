# Let's Queue Club

A React + TypeScript site built with Vite and hosted on GitHub Pages.
The initial landing page introduces the club; standings and stats are coming later.

## Local development

Use Node.js 24 (see [.nvmrc](.nvmrc)) and npm.

```sh
npm ci
npm run dev
```

- `npm run lint` checks the source with Oxlint.
- `npm run build` type-checks with TypeScript and produces the static site in `dist/`.
- `npm run preview` serves the production build locally after building.

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
  runs `npm ci`, lint, and the production build. Pushes to `main` upload only
  `dist/` as a Pages artifact and deploy using GitHub's official Pages actions.
  Pull requests run the same checks without deploying. Manual deployments are
  available from the Actions tab on `main`.
- **Permissions:** Only the deployment job receives `pages: write` and
  `id-token: write`; it depends on a successful build and uses the `github-pages`
  environment. The artifact workflow bypasses Jekyll, so no `gh-pages` branch or
  `.nojekyll` file is necessary.
- **Navigation:** The current site uses same-page anchors, not a client-side
  router. Pages has no SPA rewrite rule: refreshing a nested path such as
  `/standings` would return 404. If routes are added later, use hash routing
  (`/#/standings`) or deliberately implement a static routing strategy.
- **Data:** The intended data source is Google Sheets containing periodically
  refreshed Riot API data. This app is read-only; data integration is not yet
  implemented. Keep Riot credentials and private Google credentials in a
  separate updater/backend, never in the browser bundle or `VITE_*` variables.
  Any future browser-readable data endpoint must allow cross-origin requests.

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