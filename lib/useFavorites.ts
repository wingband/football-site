"use client"

import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "football-site:favorite-leagues-v2"

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      // localStorage는 마운트 후에만 읽을 수 있고, 렌더 중에 읽으면 서버 HTML과
      // 하이드레이션 불일치가 나므로 effect 안에서 한 번만 동기적으로 반영한다
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setFavorites(JSON.parse(raw))
    } catch {}
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
  }, [favorites, loaded])

  // useMemo 의존성 배열에 그대로 넣을 수 있도록 참조를 안정화한다
  // (isFavorite는 favorites가 바뀔 때만 새로 만들어짐)
  const toggleFavorite = useCallback((leagueId: number | string) => {
    const key = String(leagueId)
    setFavorites((prev) =>
      prev.includes(key) ? prev.filter((n) => n !== key) : [...prev, key]
    )
  }, [])

  const isFavorite = useCallback(
    (leagueId: number | string) => favorites.includes(String(leagueId)),
    [favorites]
  )

  return { favorites, toggleFavorite, isFavorite }
}
