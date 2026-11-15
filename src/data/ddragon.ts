const VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json'
const CACHE_KEY = 'lqc:ddragon:v1'
const MAX_AGE = 24 * 60 * 60 * 1000

/** Maps numeric champion IDs to Data Dragon image IDs (e.g. 62 -> "MonkeyKing"). */
export interface ChampionArt {
  version: string
  images: Record<string, string>
  savedAt: number
}

function readCache(): ChampionArt | null {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as ChampionArt | null
    return cached && Date.now() - cached.savedAt < MAX_AGE ? cached : null
  } catch {
    return null
  }
}

let pending: Promise<ChampionArt | null> | null = null

export function loadChampionArt(): Promise<ChampionArt | null> {
  pending ??= (async () => {
    const cached = readCache()
    if (cached) return cached
    try {
      const [version] = (await (await fetch(VERSIONS_URL)).json()) as string[]
      const { data } = (await (
        await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`)
      ).json()) as { data: Record<string, { id: string; key: string }> }
      const images = Object.fromEntries(Object.values(data).map((champion) => [champion.key, champion.id]))
      const art = { version, images, savedAt: Date.now() }
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(art))
      } catch {
        // Not caching is fine.
      }
      return art
    } catch {
      return null
    }
  })()
  return pending
}

export function championIconUrl(art: ChampionArt | null, championId: number): string | null {
  const image = art?.images[String(championId)]
  return image ? `https://ddragon.leagueoflegends.com/cdn/${art.version}/img/champion/${image}.png` : null
}

export function championSplashUrl(art: ChampionArt | null, championId: number): string | null {
  const image = art?.images[String(championId)]
  return image ? `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${image}_0.jpg` : null
}
