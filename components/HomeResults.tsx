"use client"

import Link from "next/link"
import { useState } from "react"
import Logo from "@/components/Logo"
import { matchLinkHref } from "@/lib/slug"
import type { HomeResult } from "@/lib/homeFixtures"

// 메인 "최근 경기 결과" (2026-10-12): 리그 탭 + 경기마다 날짜·시각·리그명. 최근 3일(한국 시간) 기준.
type Tab = { id: number; label: string }
const PAGE = 6

export default function HomeResults({ tabs, results }: { tabs: Tab[]; results: HomeResult[] }) {
  const [active, setActive] = useState<number | "all">("all")

  const countOf = (id: number) => results.filter((r) => r.leagueId === id).length
  const list = active === "all" ? results : results.filter((r) => r.leagueId === active)
  const shown = list.slice(0, active === "all" ? PAGE : 8)

  function pick(id: number | "all") {
    setActive(id)
  }

  return (
    <section className="bg-turf/40 border border-turf-line/60 rounded-2xl p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
 <h1 className="text-xl font-display text-floodlight">최근 경기 결과</h1>
        <Link href="/matches" className="text-xs sm:text-sm text-floodlight/70 hover:text-score-amber shrink-0">
          전체 경기 →
        </Link>
      </div>

      <nav className="flex gap-1.5 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]">
        {[{ id: "all" as const, label: "전체", n: results.length }, ...tabs.map((t) => ({ id: t.id, label: t.label, n: countOf(t.id) }))].map((t) => (
          <button
            key={t.id}
            onClick={() => pick(t.id)}
            className={`shrink-0 text-xs sm:text-sm px-3 py-1.5 rounded-full border transition-colors ${
              active === t.id
                ? "bg-score-amber text-pitch-night border-score-amber font-bold"
                : "border-turf-line text-floodlight/70 hover:text-floodlight hover:border-floodlight/40"
            }`}
          >
            {t.label}
            <span className={`ml-1 font-data text-[11px] ${active === t.id ? "text-pitch-night/70" : "text-floodlight/40"}`}>{t.n}</span>
          </button>
        ))}
      </nav>

      {list.length === 0 ? (
        <p className="text-sm text-floodlight/60 py-8 text-center">최근 3일 동안 끝난 경기가 없어요.</p>
      ) : (
        <>
          <ul className="divide-y divide-turf-line/40">
            {shown.map((r) => (
              <li key={r.fixtureId}>
                <Link href={matchLinkHref(r.slugSource)} className="block py-2 px-1 hover:bg-turf-line/20 rounded">
                  <p className="flex items-center gap-1.5 text-xs text-floodlight/65 mb-1 justify-center">
                    <Logo src={r.leagueLogo} alt="" className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-floodlight/85">{r.leagueName}</span>
                    <span className="text-floodlight/30">·</span>
                    <span className={r.whenLabel === "오늘" ? "text-score-amber" : ""}>{r.whenLabel}</span>
                    <span className="font-data">{r.time}</span>
                  </p>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <span className="flex items-center justify-end gap-2 min-w-0 text-sm text-floodlight">
                      <span className="truncate">{r.home.name}</span>
                      <Logo src={r.home.logo} alt="" className="w-5 h-5 shrink-0" />
                    </span>
                    <span className="flex flex-col items-center min-w-[4.5rem]">
                      <span className="font-data text-sm font-semibold text-floodlight">
                        {r.homeScore ?? "-"} : {r.awayScore ?? "-"}
                      </span>
                      <span className={`text-[11px] leading-none ${r.live ? "text-red-400" : "text-floodlight/50"}`}>{r.live ? "진행 중" : "종료"}</span>
                    </span>
                    <span className="flex items-center gap-2 min-w-0 text-sm text-floodlight">
                      <Logo src={r.away.logo} alt="" className="w-5 h-5 shrink-0" />
                      <span className="truncate">{r.away.name}</span>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/matches"
            className="mt-2 block text-center text-sm text-floodlight/70 hover:text-score-amber py-2 border-t border-turf-line/40"
          >
            전체 경기 보러가기 →
          </Link>
        </>
      )}
    </section>
  )
}
