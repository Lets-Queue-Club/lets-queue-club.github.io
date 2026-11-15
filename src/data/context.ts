import { createContext, useContext, useEffect, useState } from 'react'
import { loadChampionArt, type ChampionArt } from './ddragon.ts'
import type { League } from './model.ts'

export interface DataState {
  league: League | null
  /** When the shown data was downloaded. */
  savedAt: number | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export const DataContext = createContext<DataState | null>(null)

export function useData(): DataState {
  const state = useContext(DataContext)
  if (!state) throw new Error('useData must be used inside DataProvider.')
  return state
}

let art: ChampionArt | null = null

export function useChampionArt(): ChampionArt | null {
  const [value, setValue] = useState(art)
  useEffect(() => {
    if (value) return
    let active = true
    void loadChampionArt().then((loaded) => {
      art = loaded
      if (active) setValue(loaded)
    })
    return () => {
      active = false
    }
  }, [value])
  return value
}
