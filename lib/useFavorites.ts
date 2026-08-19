"use client"

import { useEffect, useState } from "react"

const STORAGE_KEY = "football-site:favorite-leagues"

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  // 페이지가 처음 열릴 때, 브라우저에 저장된 즐겨찾기를 불러옴
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setFavorites(JSON.parse(raw))
    } catch {
      // localStorage를 못 쓰는 환경이면 그냥 빈 배열로 시작
    }
    setLoaded(true)
  }, [])

  // favorites가 바뀔 때마다 브라우저에 저장 (최초 로드 직후는 건너뜀)
  useEffect(() => {
    if (!loaded) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
  }, [favorites, loaded])

  function toggleFavorite(leagueName: string) {
    setFavorites((prev) =>
      prev.includes(leagueName)
        ? prev.filter((n) => n !== leagueName)
        : [...prev, leagueName]
    )
  }

  function isFavorite(leagueName: string) {
    return favorites.includes(leagueName)
  }

  return { favorites, toggleFavorite, isFavorite }
}