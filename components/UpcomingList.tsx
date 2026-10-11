"use client"

import Link from "next/link"
import { useState } from "react"
import Logo from "@/components/Logo"
import PlayerAvatar from "@/components/PlayerAvatar"
import AddToCalendar from "@/components/AddToCalendar"

// 해외파 "다음 경기 일정" — 대회(리그)별로 걸러 볼 수 있다. 5대 리그·유럽대항전 외에는 "그 외"로 묶는다.
export type UpcomingRow = {
  id: number
  name: string
  teamKo: string
  oppKo: string
  oppLogo: string
  home: boolean
  group: string
  leagueKo: string
  time: string
  date: string
  href: string
  calTitle: string
  startIso: string
  calId: string
}

const ORDER = ["프리미어리그", "라리가", "분데스리가", "세리에A", "리그1", "유럽대항전", "그 외"]

export default function UpcomingList({ rows }: { rows: UpcomingRow[] }) {
  const [active, setActive] = useState("all")
  const [open, setOpen] = useState(false)
  const FOLD = 4
  const present = ORDER.filter((g) => rows.some((r) => r.group === g))
  const filtered = active === "all" ? rows : rows.filter((r) => r.group === active)
  const foldable = active === "all" && filtered.length > FOLD
  const list = foldable && !open ? filtered.slice(0, FOLD) : filtered
  const tabs = [{ key: "all", label: "전체", n: rows.length }, ...present.map((g) => ({ key: g, label: g, n: rows.filter((r) => r.group === g).length }))]

  return (
    <>
      <nav className="flex gap-1.5 overflow-x-auto pb-2 mb-1 [scrollbar-width:none]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActive(t.key)
              setOpen(false)
            }}
            className={`shrink-0 text-sm px-3 py-1 rounded-full border transition-colors ${
              active === t.key
                ? "bg-score-amber text-pitch-night border-score-amber font-bold"
                : "border-turf-line text-floodlight/80 hover:text-floodlight hover:border-floodlight/40"
            }`}
          >
            {t.label}
            <span className={`ml-1 font-data text-xs ${active === t.key ? "text-pitch-night/70" : "text-floodlight/50"}`}>{t.n}</span>
          </button>
        ))}
      </nav>
      <ul className={`divide-y divide-turf-line/40 ${foldable && open ? "max-h-[420px] overflow-y-auto overscroll-contain pr-2 scroll-dark" : ""}`}>
        {list.map((r) => (
          <li key={r.calId} className="flex items-center gap-3 py-2.5">
            <Link href={`/players/${r.id}`} className="shrink-0">
              <PlayerAvatar src={`https://media.api-sports.io/football/players/${r.id}.png`} alt={r.name} className="w-10 h-10 rounded-full ring-2 ring-score-amber/60" />
            </Link>
            <Link href={r.href} className="flex-1 min-w-0 group">
              <p className="text-sm text-floodlight group-hover:text-score-amber transition-colors truncate">
                <span className="font-semibold">{r.name}</span>
                <span className="text-floodlight/65"> · {r.teamKo}</span>
              </p>
              <p className="text-sm text-floodlight/75 flex items-center gap-1.5 min-w-0">
                <Logo src={r.oppLogo} alt="" className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {r.oppKo} ({r.home ? "홈" : "원정"})
                  <span className="text-floodlight/55"> · {r.leagueKo}</span>
                </span>
              </p>
            </Link>
            <div className="text-right shrink-0 leading-tight">
              <p className="text-sm text-score-amber font-data">{r.time}</p>
              <p className="text-xs text-floodlight/65">{r.date}</p>
            </div>
            <AddToCalendar compact title={r.calTitle} startIso={r.startIso} id={r.calId} />
          </li>
        ))}
      </ul>
      {foldable && (
        <button
          onClick={() => setOpen((v) => !v)}
          className={`mt-2 w-full text-sm text-floodlight/80 hover:text-score-amber py-2 border border-turf-line/60 hover:border-score-amber/60 ${
            open ? "sticky bottom-[4.75rem] md:bottom-3 z-10 bg-pitch-night shadow-[0_-8px_12px_-4px_rgba(0,0,0,0.6)]" : ""
          }`}
        >
          {open ? "일정 접기 ▴" : `전체 ${filtered.length}경기 펼치기 ▾`}
        </button>
      )}
    </>
  )
}
