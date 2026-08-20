import Link from "next/link"
import FollowButton from "@/components/FollowButton"

const TABS = [
  { key: "overview", label: "팀 개요", path: "" },
  { key: "table", label: "순위", path: "/table" },
  { key: "fixtures", label: "경기", path: "/fixtures" },
  { key: "topscorers", label: "득점 순위", path: "/topscorers" },
  { key: "news", label: "뉴스", path: "/news" },
] as const

export type LeagueTabKey = (typeof TABS)[number]["key"]

export default function LeagueHeader({
  leagueId,
  name,
  country,
  logo,
  season,
  active,
}: {
  leagueId: string
  name: string
  country: string
  logo: string
  season: number
  active: LeagueTabKey
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 pt-8 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <img src={logo} alt="" className="w-12 h-12 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display uppercase text-xl text-floodlight truncate">{name}</h1>
            <p className="text-xs text-floodlight/40">
              {country} · {season} 시즌
            </p>
          </div>
        </div>
        <FollowButton />
      </div>

      <div className="flex gap-1 border-b border-turf-line/60 mb-6 text-sm overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) =>
          tab.key === active ? (
            <span
              key={tab.key}
              className="shrink-0 px-4 py-3 border-b-2 border-score-amber text-score-amber font-medium"
            >
              {tab.label}
            </span>
          ) : (
            <Link
              key={tab.key}
              href={`/leagues/${leagueId}${tab.path}`}
              className="shrink-0 px-4 py-3 text-floodlight/40 hover:text-floodlight/70"
            >
              {tab.label}
            </Link>
          )
        )}
      </div>
    </div>
  )
}
