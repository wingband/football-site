"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import Logo from "@/components/Logo"
import PlayerAvatar from "@/components/PlayerAvatar"
import type { BoardPlayerRow, LeagueBoardData } from "@/lib/leagueBoard"

// 메인 화면 리그 순위 허브 (2026-10-12). 첫 리그는 서버에서 그려서 넘기고, 탭을 바꾸면 /api/league-board로 가져온다
type Tab = { id: number; label: string }

const ZONE_BAR: Record<string, string> = {
  ucl: "bg-sky-400",
  uel: "bg-orange-400",
  conf: "bg-emerald-400",
  releg: "bg-red-500",
}

export default function LeagueHub({ tabs, initial }: { tabs: Tab[]; initial: LeagueBoardData | null }) {
  const [active, setActive] = useState(initial?.leagueId ?? tabs[0].id)
  const [cache, setCache] = useState<Record<number, LeagueBoardData>>(initial ? { [initial.leagueId]: initial } : {})
  const [loading, setLoading] = useState(false)
  const reqRef = useRef(0)

  async function select(id: number) {
    setActive(id)
    if (cache[id]) return
    const req = ++reqRef.current
    setLoading(true)
    try {
      const r = await fetch(`/api/league-board?league=${id}`)
      if (r.ok) {
        const d = (await r.json()) as LeagueBoardData
        setCache((c) => ({ ...c, [id]: d }))
      }
    } finally {
      if (req === reqRef.current) setLoading(false)
    }
  }

  const data = cache[active]
  const label = tabs.find((t) => t.id === active)?.label ?? ""

  return (
    <section className="bg-turf/40 border border-turf-line/60 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-display text-xl text-floodlight shrink-0">리그 순위</h2>
        <Link href={`/leagues/${active}`} className="text-xs text-floodlight/50 hover:text-score-amber shrink-0">
          {label} 자세히 →
        </Link>
      </div>

      <nav className="flex gap-1.5 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => select(t.id)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              t.id === active
                ? "bg-score-amber text-pitch-night border-score-amber font-bold"
                : "border-turf-line text-floodlight/60 hover:text-floodlight hover:border-floodlight/40"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {!data ? (
        <p className="text-sm text-floodlight/40 py-10 text-center">{loading ? "불러오는 중…" : "순위 정보를 불러오지 못했어요."}</p>
      ) : (
        <div className={`grid gap-5 lg:grid-cols-[1fr_300px] transition-opacity ${loading ? "opacity-60" : ""}`}>
          {/* 전체 순위표 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="text-[11px] text-floodlight/40">
                  <th className="text-left font-normal pb-2 w-8">#</th>
                  <th className="text-left font-normal pb-2">팀</th>
                  <th className="text-right font-normal pb-2 w-8">경기</th>
                  <th className="text-right font-normal pb-2 w-7">승</th>
                  <th className="text-right font-normal pb-2 w-7">무</th>
                  <th className="text-right font-normal pb-2 w-7">패</th>
                  <th className="text-right font-normal pb-2 w-9">득실</th>
                  <th className="text-right font-normal pb-2 w-10">승점</th>
                </tr>
              </thead>
              <tbody>
                {data.table.map((r) => (
                  <tr key={r.teamId} className="border-t border-turf-line/30">
                    <td className="py-1.5 font-data text-floodlight/50">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1 h-4 rounded-full ${r.zone ? ZONE_BAR[r.zone] : "bg-transparent"}`} />
                        {r.rank}
                      </span>
                    </td>
                    <td className="py-1.5">
                      <Link href={`/teams/${r.teamId}`} className="flex items-center gap-2 min-w-0 hover:text-score-amber">
                        <Logo src={r.logo} alt="" className="w-5 h-5 shrink-0" />
                        <span className="truncate text-floodlight/90">{r.name}</span>
                      </Link>
                    </td>
                    <td className="py-1.5 text-right font-data text-floodlight/60">{r.played}</td>
                    <td className="py-1.5 text-right font-data text-floodlight/60">{r.win}</td>
                    <td className="py-1.5 text-right font-data text-floodlight/60">{r.draw}</td>
                    <td className="py-1.5 text-right font-data text-floodlight/60">{r.lose}</td>
                    <td className="py-1.5 text-right font-data text-floodlight/60">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                    <td className="py-1.5 text-right font-data font-semibold text-score-amber">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 flex flex-wrap gap-3 text-[10px] text-floodlight/40">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400" />챔피언스리그</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" />유로파리그</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />컨퍼런스리그</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />강등</span>
            </p>
          </div>

          {/* 득점·도움 순위 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <PlayerList title="득점 순위" unit="골" rows={data.scorers} />
            <PlayerList title="도움 순위" unit="도움" rows={data.assists} />
          </div>
        </div>
      )}
    </section>
  )
}

function PlayerList({ title, unit, rows }: { title: string; unit: string; rows: BoardPlayerRow[] }) {
  return (
    <div className="bg-pitch-night/50 border border-turf-line/40 rounded-xl p-3">
      <h3 className="text-sm font-semibold text-floodlight mb-2">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-floodlight/40 py-3">아직 기록이 없어요.</p>
      ) : (
        <ol className="space-y-1.5">
          {rows.slice(0, 5).map((p, i) => (
            <li key={p.id}>
              <Link href={`/players/${p.id}`} className="flex items-center gap-2 text-sm hover:text-score-amber">
                <span className="w-4 text-right font-data text-[11px] text-floodlight/40">{i + 1}</span>
                <PlayerAvatar src={p.photo} alt={p.name} className="w-7 h-7 rounded-full shrink-0" />
                <span className="truncate text-floodlight/90">{p.name}</span>
                <Logo src={p.teamLogo} alt="" className="w-4 h-4 shrink-0" />
                <span className="ml-auto shrink-0 font-data font-semibold text-score-amber">
                  {p.value}
                  <span className="text-[10px] text-floodlight/40 ml-0.5">{unit}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
