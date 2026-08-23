"use client"

import { useEffect, useState } from "react"

const STORAGE_KEY = "football-site:favorite-leagues-v2"

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setFavorites(JSON.parse(raw))
    } catch {}
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
  }, [favorites, loaded])

  function toggleFavorite(leagueId: number | string) {
    const key = String(leagueId)
    setFavorites((prev) =>
      prev.includes(key) ? prev.filter((n) => n !== key) : [...prev, key]
    )
  }

  function isFavorite(leagueId: number | string) {
    return favorites.includes(String(leagueId))
  }

  return { favorites, toggleFavorite, isFavorite }
}
