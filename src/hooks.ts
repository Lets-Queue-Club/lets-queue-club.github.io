import { useEffect } from 'react'

export function useTitle(title: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · Let's Queue Club` : "Let's Queue Club"
  }, [title])
}
