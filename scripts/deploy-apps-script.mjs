// Pushes apps-script/ and redeploys the existing Web App deployment so its URL
// stays the same. Usage: npm run gas:deploy -- "optional description"
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// From https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
const DEPLOYMENT_ID =
  'AKfycbyxm5Teyjm5D8H76veSq1gUwa2nR2362RIKVoMQNYDh7gImcUTcYzLO47X_wGG9V-_z5g'

const description =
  process.argv.slice(2).join(' ') || `Deployed ${new Date().toISOString()}`

// Run clasp's entry file with Node directly, avoiding a shell on Windows.
const claspDir = fileURLToPath(
  new URL('../node_modules/@google/clasp/', import.meta.url),
)
const { bin } = JSON.parse(readFileSync(join(claspDir, 'package.json'), 'utf8'))
const claspBin = join(claspDir, typeof bin === 'string' ? bin : bin.clasp)

function clasp(args) {
  const result = spawnSync(process.execPath, [claspBin, ...args], {
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

clasp(['push', '--force'])
clasp(['deploy', '-i', DEPLOYMENT_ID, '-d', description])
