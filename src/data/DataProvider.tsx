import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DataContext, type DataState } from './context.ts'
import { buildLeague } from './model.ts'
import { fetchSnapshot, readCachedSnapshot, type Snapshot } from './source.ts'

/** Shows cached data immediately, then refreshes it from the sheet in the background. */
export function DataProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(readCachedSnapshot)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchSnapshot(controller.signal)
      .then((fresh) => {
        setSnapshot(fresh)
        setError(null)
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setError(reason instanceof Error ? reason.message : 'The data could not be loaded.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [attempt])

  const league = useMemo(() => (snapshot ? buildLeague(snapshot.database) : null), [snapshot])
  useEffect(() => {
    if (import.meta.env.DEV && league?.issues.length) console.warn('Data issues:', league.issues)
  }, [league])

  const refresh = useCallback(() => {
    setLoading(true)
    setAttempt((value) => value + 1)
  }, [])

  const value = useMemo<DataState>(
    () => ({ league, savedAt: snapshot?.savedAt ?? null, loading, error, refresh }),
    [league, snapshot, loading, error, refresh],
  )
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
