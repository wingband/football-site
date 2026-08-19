"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function Header() {
  const [query, setQuery] = useState("")
  const router = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed.length === 0) return
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <header className="sticky top-0 z-50 bg-pitch-night/95 backdrop-blur border-b border-turf-line/60">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-8">
        <Link href="/matches" className="font-display uppercase tracking-wide text-lg text-score-amber shrink-0">
          Football Site
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-floodlight/70 shrink-0">
          <Link href="/matches" className="hover:text-floodlight transition-colors">
            경기
          </Link>
          <Link href="/transfers" className="hover:text-floodlight transition-colors">
            이적
          </Link>
        </nav>

        {/* 검색창 */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xs hidden sm:block">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="팀, 선수, 리그 검색"
            className="w-full bg-turf/60 border border-turf-line rounded-full px-4 py-1.5 text-sm text-floodlight placeholder:text-floodlight/30 focus:outline-none focus:border-score-amber transition-colors"
          />
        </form>
      </div>
    </header>
  )
}