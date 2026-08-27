"use client"

import Link from "next/link"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import FollowButton from "@/components/FollowButton"
import Logo from "@/components/Logo"

const TABS = [
  { key: "overview",    label: "팀 개요",      path: "" },
  { key: "table",       label: "순위",          path: "/table" },
  { key: "fixtures",    label: "경기",          path: "/fixtures" },
  { key: "squad",       label: "스쿼드",        path: "/squad" },
  { key: "playerstats", label: "플레이어 통계", path: "/playerstats" },
  { key: "teamstats",   label: "팀 통계",       path: "/teamstats" },
  { key: "topscorers",  label: "득점 순위",     path: "/topscorers" },
  { key: "news",        label: "뉴스",          path: "/news" },
] as const

export default function LeagueHeader({
  leagueId,
  name,
  country,
  logo,
  season,
}: {
  leagueId: string
  name: string
  country: string
  logo: string
  season: number
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const base = `/leagues/${leagueId}`
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : ""
  const active = TABS.find((t) => t.path === rest)?.key ?? "overview"

  // URL의 season 파라미터 또는 기본 시즌
  const selectedSeason = parseInt(searchParams.get("season") ?? String(season))
  const seasons = Array.from({ length: 8 }, (_, i) => season - i)

  function handleSeasonChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("season", e.target.value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 pt-8 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Logo src={logo} alt="" className="w-12 h-12 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display uppercase text-xl text-floodlight truncate">{name}</h1>
            <p className="text-xs text-floodlight/40">{country}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* 시즌 선택 드롭다운 */}
          <select
            value={selectedSeason}
            onChange={handleSeasonChange}
            className="bg-turf-line/40 border border-turf-line text-floodlight text-sm rounded-full px-3 py-1.5 focus:outline-none focus:border-score-amber cursor-pointer"
          >
            {seasons.map((s) => (
              <option key={s} value={s} className="bg-pitch-night">
                {s}/{String(s + 1).slice(2)}
              </option>
            ))}
          </select>
          <FollowButton />
        </div>
      </div>

      <div className="flex gap-1 border-b border-turf-line/60 mb-6 text-sm overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => {
          const href = `${base}${tab.path}${selectedSeason !== season ? `?season=${selectedSeason}` : ""}`
          return tab.key === active ? (
            <span
              key={tab.key}
              className="shrink-0 px-4 py-3 border-b-2 border-score-amber text-score-amber font-medium"
            >
              {tab.label}
            </span>
          ) : (
            <Link
              key={tab.key}
              href={href}
              className="shrink-0 px-4 py-3 text-floodlight/50 hover:text-floodlight/80 transition-colors"
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
