import type { Database } from './types.ts'

/** The public, read-only Apps Script Web App (see apps-script/Code.js). */
export const DATA_URL =
  import.meta.env.VITE_DATA_URL ??
  'https://script.google.com/macros/s/AKfycbyxm5Teyjm5D8H76veSq1gUwa2nR2362RIKVoMQNYDh7gImcUTcYzLO47X_wGG9V-_z5g/exec'

const CACHE_KEY = 'lqc:database:v1'

export interface Snapshot {
  database: Database
  savedAt: number
}

export function readCachedSnapshot(): Snapshot | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    const snapshot = JSON.parse(cached) as Snapshot
    return snapshot && typeof snapshot.savedAt === 'number' && snapshot.database ? snapshot : null
  } catch {
    return null
  }
}

export async function fetchSnapshot(signal?: AbortSignal): Promise<Snapshot> {
  const response = await fetch(DATA_URL, { signal })
  if (!response.ok) throw new Error(`The data service responded with HTTP ${response.status}.`)
  const database = (await response.json()) as Database
  if (!database || typeof database !== 'object' || Array.isArray(database)) {
    throw new Error('The data service returned an unexpected response.')
  }
  const snapshot = { database, savedAt: Date.now() }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot))
  } catch {
    // Storage can be full or disabled; the site still works without the cache.
  }
  return snapshot
}
