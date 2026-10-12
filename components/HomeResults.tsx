"use client"

import Link from "next/link"
import { useState } from "react"
import Logo from "@/components/Logo"
import { matchLinkHref } from "@/lib/slug"
import type { HomeResult } from "@/lib/homeFixtures"

// 메인 "최근 경기 결과" (2026-10-12): 리그 탭 + 경기마다 날짜·시각·리그명. 최근 3일(한국 시간) 기준.
type Tab = { id: number; label: string }
const PAGE = 4
const LEAGUE_ICON: Record<number, string> = {
  39: "/leagues/pl.png", 140: "/leagues/laliga.png", 78: "/leagues/bundesliga.png", 135: "/leagues/seriea.png",
  61: "/leagues/ligue1.png", 292: "/leagues/kleague.png", 2: "/leagues/cl.png", 3: "/leagues/europa.png",
}

export default function HomeResults({ tabs, results }: { tabs: Tab[]; results: HomeResult[] }) {
  const [active, setActive] = useState<number | "all">("all")
  const [open, setOpen] = useState(false)

  const countOf = (id: number) => results.filter((r) => r.leagueId === id).length
  const list = active === "all" ? results : results.filter((r) => r.leagueId === active)
  const shown = open ? list : list.slice(0, PAGE)

  function pick(id: number | "all") {
    setActive(id)
    setOpen(false)
  }

  return (
    <section className="border-t border-turf-line/50 pt-4">
      <div className="flex items-baseline justify-between gap-3 mb-3">
 <h2 className="text-base font-semibold text-floodlight">최근 경기 결과</h2>
        <Link href="/matches" className="text-xs sm:text-sm text-floodlight/70 hover:text-score-amber shrink-0">
          전체 경기 →
        </Link>
      </div>

      <nav className="flex gap-1 pb-3 border-b border-turf-line/40 mb-1" aria-label="리그 선택">
        {[{ id: "all" as const, label: "전체", n: results.length }, ...tabs.map((t) => ({ id: t.id, label: t.label, n: countOf(t.id) }))].map((t) => (
          <button
            key={t.id}
            onClick={() => pick(t.id)}
            title={t.label}
            aria-label={`${t.label} ${t.n}경기`}
            aria-pressed={active === t.id}
            className={`flex-1 min-w-0 h-10 flex items-center justify-center gap-1 border-b-2 transition-colors ${
              active === t.id
                ? "border-score-amber bg-turf-line/20"
                : t.n === 0
                ? "border-transparent opacity-30"
                : "border-transparent opacity-60 hover:opacity-100 hover:bg-turf-line/10"
            }`}
          >
            {t.id === "all" ? (
              <span className={`text-xs sm:text-sm font-semibold ${active === t.id ? "text-score-amber" : "text-floodlight"}`}>전체</span>
            ) : (
              <Logo src={LEAGUE_ICON[t.id] ?? ""} alt="" className="w-5 h-5 shrink-0" />
            )}
            <span className={`hidden sm:inline font-data text-[11px] ${active === t.id ? "text-score-amber" : "text-floodlight/50"}`}>{t.n}</span>
          </button>
        ))}
      </nav>

      {list.length === 0 ? (
        <p className="text-sm text-floodlight/60 py-8 text-center">최근 3일 동안 끝난 경기가 없어요.</p>
      ) : (
        <>
          <ul className={`divide-y divide-turf-line/40 overscroll-contain pr-2 scroll-dark [scrollbar-gutter:stable] overflow-y-auto ${open ? "max-h-[420px]" : ""}`}>
            {shown.map((r) => (
              <li key={r.fixtureId}>
                <Link href={matchLinkHref(r.slugSource)} className="flex flex-col gap-1 py-2.5 px-1 hover:bg-turf-line/20 rounded sm:flex-row sm:items-center sm:gap-4">
                  <p className="flex items-center gap-1.5 text-xs text-floodlight/65 sm:w-32 sm:shrink-0">
                    {active === "all" && <Logo src={r.leagueLogo} alt={r.leagueName} className="w-4 h-4 shrink-0" />}
                    <span className={r.whenLabel === "오늘" ? "text-score-amber" : ""}>{r.whenLabel}</span>
                    <span className="font-data">{r.time}</span>
                  </p>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex-1">
                    <span className="flex items-center justify-end gap-2 min-w-0 text-sm text-floodlight">
                      <span className="truncate">{r.home.name}</span>
                      <Logo src={r.home.logo} alt="" className="w-5 h-5 shrink-0" />
                    </span>
                    <span className="flex flex-col items-center min-w-[4.5rem]">
                      <span className="font-data text-sm font-semibold text-floodlight">
                        {r.homeScore ?? "-"} : {r.awayScore ?? "-"}
                      </span>
                      <span className={`text-xs leading-none ${r.live ? "text-red-400" : "text-floodlight/50"}`}>{r.live ? "진행 중" : "종료"}</span>
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
          {list.length > PAGE && (
            <button
              onClick={() => setOpen((v) => !v)}
              className={`mt-2 w-full text-sm text-floodlight/80 hover:text-score-amber py-2 border border-turf-line/60 hover:border-score-amber/60 ${
                open ? "sticky bottom-[4.75rem] md:bottom-3 z-10 bg-pitch-night shadow-[0_-8px_12px_-4px_rgba(0,0,0,0.6)]" : ""
              }`}
            >
              {open ? "경기 접기 ▴" : `나머지 ${list.length - PAGE}경기 펼치기 ▾`}
            </button>
          )}
          <Link
            href="/matches"
            className="mt-1 block text-center text-sm text-floodlight/70 hover:text-score-amber py-2"
          >
            전체 경기 보러가기 →
          </Link>
        </>
      )}
    </section>
  )
}
