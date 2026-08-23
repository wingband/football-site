"use client"

import { useState } from "react"
import Link from "next/link"
import { matchHref } from "@/lib/slug"
import type { LeagueFixture } from "@/lib/leagueData"

const FINISHED_CODES = ["FT", "AET", "PEN"]
type Mode = "date" | "round" | "team"

function FixtureRow({ fx }: { fx: LeagueFixture }) {
  const finished = FINISHED_CODES.includes(fx.fixture.status.short)
  const timeText = new Date(fx.fixture.date).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
  return (
    <Link
      href={matchHref(fx)}
      className="flex items-center justify-center gap-3 px-4 py-4 text-sm hover:bg-turf-line/20 border-b border-turf-line/20 last:border-b-0"
    >
      <span className="flex-1 text-right truncate">{fx.teams.home.name}</span>
      <img src={fx.teams.home.logo} alt="" className="w-5 h-5 shrink-0" />
      <span className="font-data text-score-amber w-16 text-center shrink-0">
        {finished ? `${fx.goals.home} - ${fx.goals.away}` : timeText}
      </span>
      <img src={fx.teams.away.logo} alt="" className="w-5 h-5 shrink-0" />
      <span className="flex-1 truncate">{fx.teams.away.name}</span>
    </Link>
  )
}

function groupBy<T>(list: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of list) {
    const key = keyFn(item)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return map
}

export default function FixturesView({ fixtures }: { fixtures: LeagueFixture[] }) {
  const [mode, setMode] = useState<Mode>("date")
  const [teamFilter, setTeamFilter] = useState<string>("전체")

  const sorted = [...fixtures].sort(
    (a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
  )

  const teamNames = Array.from(
    new Set(sorted.flatMap((fx) => [fx.teams.home.name, fx.teams.away.name]))
  ).sort()

  if (sorted.length === 0) {
    return <p className="text-floodlight/40 text-sm py-6">경기 일정 정보가 없습니다.</p>
  }

  let groups: Map<string, LeagueFixture[]>

  if (mode === "date") {
    groups = groupBy(sorted, (fx) =>
      new Date(fx.fixture.date).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      })
    )
  } else if (mode === "round") {
    groups = groupBy(sorted, (fx) => fx.league?.round ?? "라운드 정보 없음")
  } else {
    const filtered =
      teamFilter === "전체"
        ? sorted
        : sorted.filter((fx) => fx.teams.home.name === teamFilter || fx.teams.away.name === teamFilter)
    groups = groupBy(filtered, (fx) =>
      new Date(fx.fixture.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["date", "round", "team"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              mode === m ? "bg-floodlight text-pitch-night" : "bg-turf-line/40 text-floodlight/60 hover:text-floodlight"
            }`}
          >
            {m === "date" ? "날짜별" : m === "round" ? "라운드별" : "팀별"}
          </button>
        ))}

        {mode === "team" && (
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="ml-auto bg-turf-line/40 border border-turf-line text-floodlight text-xs rounded-full px-3 py-1.5 focus:outline-none focus:border-score-amber cursor-pointer"
          >
            <option value="전체" className="bg-pitch-night">전체 팀</option>
            {teamNames.map((name) => (
              <option key={name} value={name} className="bg-pitch-night">
                {name}
              </option>
            ))}
          </select>
        )}
      </div>

      {[...groups.entries()].map(([label, list]) => (
        <div key={label} className="mb-2">
          <p className="px-4 py-2.5 bg-turf-line/30 rounded text-sm text-floodlight/70 font-medium">{label}</p>
          {list.map((fx) => (
            <FixtureRow key={fx.fixture.id} fx={fx} />
          ))}
        </div>
      ))}
    </div>
  )
}
