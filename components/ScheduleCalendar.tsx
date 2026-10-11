"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import Logo from "@/components/Logo"
import type { ScheduleMatch } from "@/lib/schedule"

// 일정 달력 (2026-10-12). 한 달 전체를 펼쳐 놓고 칸마다 경기를 넣는다. 날짜를 누르면 아래에 그날 경기 전체.
const WEEK = ["일", "월", "화", "수", "목", "금", "토"]
const KOREAN = "korean"

type Props = {
  month: string
  today: string
  prevMonth: string | null
  nextMonth: string | null
  isCurrentMonth: boolean
  leagues: { id: number; label: string }[]
  matches: ScheduleMatch[]
}

export default function ScheduleCalendar({ month, today, prevMonth, nextMonth, isCurrentMonth, leagues, matches }: Props) {
  const [filter, setFilter] = useState<string>("all")
  const [y, m] = month.split("-").map(Number)
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()

  const leagueOrder = useMemo(() => new Map(leagues.map((l, i) => [l.id, i])), [leagues])

  const byDay = useMemo(() => {
    const visible = matches.filter((x) =>
      filter === "all" ? true : filter === KOREAN ? x.korean.length > 0 : x.leagueId === Number(filter)
    )
    const map = new Map<string, ScheduleMatch[]>()
    for (const x of visible) map.set(x.day, [...(map.get(x.day) ?? []), x])
    // 칸 안에서는 해외파 경기 → 주요 리그 순 → 시간 순
    for (const list of map.values())
      list.sort(
        (a, b) =>
          Number(b.korean.length > 0) - Number(a.korean.length > 0) ||
          (leagueOrder.get(a.leagueId) ?? 99) - (leagueOrder.get(b.leagueId) ?? 99) ||
          a.date.localeCompare(b.date)
      )
    return map
  }, [matches, filter, leagueOrder])

  const defaultDay = isCurrentMonth ? today : ([...byDay.keys()].sort()[0] ?? `${month}-01`)
  const [picked, setPicked] = useState<string | null>(null)
  const selected = picked && picked.startsWith(month) ? picked : defaultDay

  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ]
  while (cells.length % 7) cells.push(null)

  const selectedList = [...(byDay.get(selected) ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  const groups = new Map<string, ScheduleMatch[]>()
  for (const x of selectedList) groups.set(x.leagueShort, [...(groups.get(x.leagueShort) ?? []), x])

  return (
    <div>
      {/* 달 이동 */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <MonthLink month={prevMonth} label="‹" aria="이전 달" />
 <h2 className="text-base font-semibold font-display text-floodlight tabular-nums">
            {y}년 {m}월
          </h2>
          <MonthLink month={nextMonth} label="›" aria="다음 달" />
        </div>
        {!isCurrentMonth && (
          <Link href="/schedule" className="text-xs px-3 py-1.5 rounded-full border border-turf-line text-floodlight/70 hover:border-score-amber hover:text-score-amber">
            오늘
          </Link>
        )}
      </div>

      {/* 필터 */}
      <nav className="flex gap-1.5 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]">
        {[{ key: "all", label: "전체" }, { key: KOREAN, label: "🇰🇷 해외파" }, ...leagues.map((l) => ({ key: String(l.id), label: l.label }))].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === f.key
                ? "bg-score-amber text-pitch-night border-score-amber font-bold"
                : "border-turf-line text-floodlight/60 hover:text-floodlight hover:border-floodlight/40"
            }`}
          >
            {f.label}
          </button>
        ))}
      </nav>

      <p className="mb-2 text-xs sm:text-sm text-floodlight/70">
        <span className="inline-block px-1.5 rounded bg-score-amber/15 text-score-amber mr-1">노란 칸</span>
        은 해외파가 뛰는 경기예요. 팀 이름은 엠블럼으로 보여드리고, 날짜를 누르면 아래에 팀 이름과 함께 전부 나와요.
      </p>

      {/* 달력 */}
      <div className="border border-turf-line/60 rounded-2xl overflow-hidden bg-turf/30">
        <div className="grid grid-cols-7 border-b border-turf-line/60 text-xs">
          {WEEK.map((w, i) => (
            <div
              key={w}
              className={`py-2 text-center font-semibold ${i === 0 ? "text-red-400" : i === 6 ? "text-sky-400" : "text-floodlight/50"}`}
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} className="min-h-14 sm:min-h-32 border-b border-r border-turf-line/30 bg-pitch-night/40" />
            const list = byDay.get(day) ?? []
            const dateNum = Number(day.slice(8))
            const weekday = i % 7
            const isToday = day === today
            const isSelected = day === selected
            const hasKorean = list.some((x) => x.korean.length > 0)
            return (
              <button
                key={day}
                onClick={() => setPicked(day)}
                className={`min-h-14 sm:min-h-32 p-1 sm:p-1.5 text-left align-top border-b border-r border-turf-line/30 transition-colors flex flex-col ${
                  isSelected ? "bg-score-amber/10 ring-1 ring-inset ring-score-amber/70" : "hover:bg-turf-line/20"
                }`}
              >
                <span className="flex items-center justify-between">
                  <span
                    className={`text-xs sm:text-sm font-data w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday ? "bg-red-500 text-white font-bold" : weekday === 0 ? "text-red-400" : weekday === 6 ? "text-sky-400" : "text-floodlight/80"
                    }`}
                  >
                    {dateNum}
                  </span>
                  {hasKorean && <span className="sm:hidden w-1.5 h-1.5 rounded-full bg-score-amber" />}
                </span>

                {/* 데스크톱: 팀 이름은 잘리니까 엠블럼으로, 해외파 경기는 선수 이름을 붙인다 */}
                <span className="hidden sm:flex flex-col gap-1 mt-1 min-w-0 w-full">
                  {list.slice(0, 4).map((x) => (
                    <span
                      key={x.id}
                      title={`${x.home} vs ${x.away}${x.korean.length ? ` (${x.korean.join(", ")})` : ""}`}
                      className={`flex items-center gap-1 min-w-0 text-[11px] leading-5 px-1 rounded ${
                        x.korean.length > 0 ? "bg-score-amber/15 text-score-amber" : "text-floodlight/80"
                      }`}
                    >
                      <span className="font-data text-[11px] text-floodlight/55 shrink-0">{x.status === "finished" ? "종료" : x.time}</span>
                      <Logo src={x.homeLogo} alt={x.home} className="w-[18px] h-[18px] shrink-0" />
                      <span className="text-floodlight/40 text-[10px] shrink-0">vs</span>
                      <Logo src={x.awayLogo} alt={x.away} className="w-[18px] h-[18px] shrink-0" />
                      {x.korean.length > 0 && <span className="truncate font-semibold">{x.korean.join("·")}</span>}
                    </span>
                  ))}
                  {list.length > 4 && <span className="text-[11px] text-floodlight/60 px-1">+{list.length - 4}경기 더</span>}
                </span>

                {/* 모바일: 경기 수만 */}
                {list.length > 0 && <span className="sm:hidden mt-auto text-[10px] text-floodlight/50 font-data">{list.length}경기</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* 선택한 날짜 경기 목록 */}
      <section className="mt-5 bg-turf/40 border border-turf-line/60 rounded-2xl p-4 sm:p-5">
 <h3 className="text-sm font-semibold font-display text-floodlight mb-3">
          {Number(selected.slice(5, 7))}월 {Number(selected.slice(8))}일 ({WEEK[new Date(`${selected}T00:00:00Z`).getUTCDay()]}) 경기
          <span className="ml-2 text-xs text-floodlight/40 font-sans">한국 시간</span>
        </h3>
        {selectedList.length === 0 ? (
          <p className="text-sm text-floodlight/40 py-4">이 날은 경기가 없어요.</p>
        ) : (
          <div className="space-y-4">
            {[...groups].map(([league, list]) => (
              <div key={league}>
                <p className="text-[11px] tracking-wide text-floodlight/40 mb-1">{league}</p>
                <ul className="divide-y divide-turf-line/40">
                  {list.map((x) => (
                    <li key={x.id}>
                      <Link href={x.href} className="grid grid-cols-[3rem_1fr_auto_1fr] items-center gap-2 py-2 hover:bg-turf-line/20 rounded text-sm">
                        <span className={`font-data text-xs ${x.status === "live" ? "text-red-400" : "text-floodlight/50"}`}>
                          {x.status === "live" ? "진행 중" : x.status === "postponed" ? "연기" : x.time}
                        </span>
                        <span className="flex items-center justify-end gap-2 min-w-0">
                          <span className="truncate text-floodlight/90">{x.home}</span>
                          <Logo src={x.homeLogo} alt="" className="w-5 h-5 shrink-0" />
                        </span>
                        <span className="font-data font-semibold text-floodlight min-w-12 text-center">
                          {x.status === "finished" || x.status === "live" ? `${x.homeScore ?? "-"} : ${x.awayScore ?? "-"}` : "vs"}
                        </span>
                        <span className="flex items-center gap-2 min-w-0">
                          <Logo src={x.awayLogo} alt="" className="w-5 h-5 shrink-0" />
                          <span className="truncate text-floodlight/90">{x.away}</span>
                          {x.korean.length > 0 && (
                            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-score-amber/15 text-score-amber">
                              🇰🇷 {x.korean.join("·")}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function MonthLink({ month, label, aria }: { month: string | null; label: string; aria: string }) {
  const cls = "w-8 h-8 flex items-center justify-center rounded-full border border-turf-line text-lg"
  if (!month) return <span className={`${cls} text-floodlight/20`}>{label}</span>
  return (
    <Link href={`/schedule?month=${month}`} aria-label={aria} className={`${cls} text-floodlight/70 hover:border-score-amber hover:text-score-amber`}>
      {label}
    </Link>
  )
}
