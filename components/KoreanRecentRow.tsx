"use client"

import Link from "next/link"
import { useState } from "react"
import PlayerAvatar from "@/components/PlayerAvatar"
import type { MatchDetail } from "@/lib/koreanWeekly"

// 해외파 "최근 7일 활약" 한 줄 (2026-10-17). 누르면 그 경기에서 선수가 남긴 세부 기록이 아래로 펼쳐진다.
// 평점만으로는 안 보이는 "어떤 식으로 영향력을 냈는지"(슈팅·키패스·드리블·경합·수비 등)를 보여주는 목적.

export type RecentRowData = {
  playerId: number
  name: string
  teamKo: string
  photo: string
  goals: number
  assists: number
  red: number
  yellow: number
  result: "W" | "D" | "L" | null
  myScore: number | null
  oppScore: number | null
  oppKo: string
  isHome: boolean
  leagueKo: string
  rating: number | null
  minutes: number | null
  substitute: boolean | null
  matchHref: string
  detail: MatchDetail | null
}

const RESULT_STYLE: Record<string, string> = {
  W: "bg-emerald-500/20 text-emerald-300",
  D: "bg-floodlight/10 text-floodlight/60",
  L: "bg-red-500/20 text-red-300",
}
const RESULT_LABEL: Record<string, string> = { W: "승", D: "무", L: "패" }
const POS_KO: Record<string, string> = { G: "골키퍼", D: "수비수", M: "미드필더", F: "공격수" }

function ratingColor(r: number | null) {
  if (r === null) return "text-floodlight/60"
  if (r >= 7.5) return "text-emerald-300"
  if (r >= 6.8) return "text-score-amber"
  return "text-floodlight/70"
}

// 기록 하나를 "수치 + 설명"으로. 값이 없으면(null) 표시하지 않는다.
function stat(label: string, value: string | null, strong = false) {
  if (value === null) return null
  return { label, value, strong }
}

function buildStats(r: RecentRowData) {
  const d = r.detail
  if (!d) return []
  const n = (v: number | null) => (v === null ? null : String(v))
  const ratio = (a: number | null, b: number | null) => (a === null && b === null ? null : `${a ?? 0}/${b ?? 0}`)
  const isGk = d.position === "G"
  const list = [
    r.goals + r.assists > 0 ? stat("공격 포인트", `${r.goals}골 ${r.assists}도움`, true) : null,
    isGk ? stat("선방", n(d.saves), (d.saves ?? 0) >= 4) : null,
    isGk ? stat("실점", n(d.conceded)) : null,
    stat("슈팅 (유효/전체)", ratio(d.shotsOn, d.shots), (d.shotsOn ?? 0) >= 2),
    stat("키패스", n(d.keyPasses), (d.keyPasses ?? 0) >= 2),
    stat("패스", n(d.passes)),
    stat("드리블 (성공/시도)", ratio(d.dribbleSuccess, d.dribbleAttempts), (d.dribbleSuccess ?? 0) >= 2),
    stat("경합 (승/전체)", ratio(d.duelsWon, d.duels)),
    stat("태클", n(d.tackles), (d.tackles ?? 0) >= 3),
    stat("가로채기", n(d.interceptions), (d.interceptions ?? 0) >= 2),
    stat("블록", n(d.blocks)),
    stat("파울 유도", n(d.foulsDrawn)),
    stat("파울", n(d.foulsCommitted)),
    r.yellow + r.red > 0 ? stat("카드", `${r.yellow > 0 ? `경고 ${r.yellow}` : ""}${r.yellow > 0 && r.red > 0 ? " · " : ""}${r.red > 0 ? "퇴장" : ""}`, r.red > 0) : null,
  ]
  return list.filter((x): x is NonNullable<typeof x> => x !== null)
}

// 데이터로만 뽑는 한 줄 요약 (판단 없이, 눈에 띄는 수치만 나열)
function headline(r: RecentRowData) {
  const d = r.detail
  const parts: string[] = []
  if (r.goals > 0) parts.push(`${r.goals}골`)
  if (r.assists > 0) parts.push(`${r.assists}도움`)
  if (d) {
    if (d.position === "G" && (d.saves ?? 0) > 0) parts.push(`선방 ${d.saves}회`)
    if ((d.keyPasses ?? 0) >= 2) parts.push(`키패스 ${d.keyPasses}회`)
    if ((d.shotsOn ?? 0) >= 2) parts.push(`유효슈팅 ${d.shotsOn}회`)
    if ((d.dribbleSuccess ?? 0) >= 2) parts.push(`드리블 성공 ${d.dribbleSuccess}회`)
    if ((d.tackles ?? 0) >= 3) parts.push(`태클 ${d.tackles}회`)
    if (d.duels !== null && d.duelsWon !== null && d.duels >= 6 && d.duelsWon / d.duels >= 0.6) parts.push(`경합 승률 ${Math.round((d.duelsWon / d.duels) * 100)}%`)
  }
  if (r.red > 0) parts.push("퇴장")
  return parts.length ? parts.join(" · ") : null
}

export default function KoreanRecentRow({ r }: { r: RecentRowData }) {
  const [open, setOpen] = useState(false)
  const stats = buildStats(r)
  const head = headline(r)
  const pos = r.detail?.position ? POS_KO[r.detail.position] ?? r.detail.position : null

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left flex items-center gap-3 py-2.5 group"
      >
        <PlayerAvatar src={r.photo} alt={r.name} className="w-10 h-10 rounded-full ring-2 ring-score-amber/60 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-floodlight group-hover:text-score-amber transition-colors truncate">
            <span className="font-semibold">{r.name}</span>
            <span className="ml-1.5 text-floodlight/50">{r.teamKo}</span>
            {r.goals > 0 && <span className="ml-1.5 text-emerald-300">⚽{r.goals}</span>}
            {r.assists > 0 && <span className="ml-1.5 text-sky-300">🅰️{r.assists}</span>}
            {r.red > 0 && <span className="ml-1.5">🟥</span>}
          </p>
          <p className="text-sm text-floodlight/75 truncate">
            {r.result && <span className={`mr-1.5 px-1.5 rounded text-xs font-bold ${RESULT_STYLE[r.result]}`}>{RESULT_LABEL[r.result]}</span>}
            <span className="font-data">{r.myScore}:{r.oppScore}</span> {r.oppKo}
            <span className="text-floodlight/45"> ({r.isHome ? "홈" : "원정"}) · {r.leagueKo}</span>
          </p>
        </div>
        <div className="text-right shrink-0 leading-tight">
          <p className={`font-data text-base font-bold ${ratingColor(r.rating)}`}>{r.rating !== null ? r.rating.toFixed(1) : "-"}</p>
          <p className="text-xs text-floodlight/65">{r.substitute ? "교체 " : "선발 "}{r.minutes}분</p>
        </div>
        <span aria-hidden className={`shrink-0 text-floodlight/40 text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="mb-3 ml-[3.25rem] pl-3 border-l-2 border-score-amber/50">
          {head && <p className="text-sm font-semibold text-floodlight mb-2 break-keep">{head}</p>}
          {pos && <p className="text-xs text-floodlight/55 mb-2">{pos}{r.detail?.captain ? " · 주장" : ""}{r.substitute ? " · 교체 투입" : " · 선발"}</p>}
          {stats.length > 0 ? (
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-sm">
              {stats.map((s) => (
                <div key={s.label} className="flex items-baseline justify-between gap-2 border-b border-turf-line/30 pb-1">
                  <dt className="text-floodlight/60 text-xs">{s.label}</dt>
                  <dd className={`font-data ${s.strong ? "text-score-amber font-bold" : "text-floodlight/85"}`}>{s.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-floodlight/55">이 경기는 선수별 세부 기록이 제공되지 않아요.</p>
          )}
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <Link href={r.matchHref} className="text-score-amber hover:underline">경기 상세 보기 →</Link>
            <Link href={`/players/${r.playerId}`} className="text-floodlight/60 hover:text-floodlight">선수 페이지 →</Link>
          </div>
        </div>
      )}
    </li>
  )
}
