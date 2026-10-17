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

// (2026-10-17) 표 대신 "큰 숫자 + 작은 라벨" 타일을 공격/수비/기타 묶음으로. 0인 항목은 숨겨 눈에 띄는 것만 남긴다.
type Tile = { label: string; value: string; strong: boolean }
type Group = { title: string; tiles: Tile[] }

function buildGroups(r: RecentRowData): Group[] {
  const d = r.detail
  if (!d) return []
  const isGk = d.position === "G"
  const num = (label: string, v: number | null, strongAt = Infinity): Tile | null =>
    v === null || v === 0 ? null : { label, value: String(v), strong: v >= strongAt }
  const ratio = (label: string, a: number | null, b: number | null, strongAt = Infinity): Tile | null =>
    (a ?? 0) === 0 && (b ?? 0) === 0 ? null : { label, value: `${a ?? 0}/${b ?? 0}`, strong: (a ?? 0) >= strongAt }
  const keep = (t: (Tile | null)[]) => t.filter((x): x is Tile => x !== null)

  const attack = keep([
    r.goals > 0 ? { label: "골", value: String(r.goals), strong: true } : null,
    r.assists > 0 ? { label: "도움", value: String(r.assists), strong: true } : null,
    ratio("슈팅 유효/전체", d.shotsOn, d.shots, 2),
    num("키패스", d.keyPasses, 2),
    ratio("드리블 성공/시도", d.dribbleSuccess, d.dribbleAttempts, 2),
    num("파울 유도", d.foulsDrawn, 3),
  ])
  const defense = keep([
    isGk ? num("선방", d.saves, 4) : null,
    isGk ? (d.conceded === null ? null : { label: "실점", value: String(d.conceded), strong: false }) : null,
    num("태클", d.tackles, 3),
    num("가로채기", d.interceptions, 2),
    num("블록", d.blocks, 2),
    ratio("경합 승/전체", d.duelsWon, d.duels, 6),
  ])
  const etc = keep([
    num("패스", d.passes),
    num("파울", d.foulsCommitted),
    r.yellow > 0 ? { label: "경고", value: String(r.yellow), strong: false } : null,
    r.red > 0 ? { label: "퇴장", value: "1", strong: true } : null,
  ])
  return [
    { title: "공격", tiles: attack },
    { title: "수비", tiles: defense },
    { title: "기타", tiles: etc },
  ].filter((g) => g.tiles.length > 0)
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
  const groups = buildGroups(r)
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
        <div className="mb-4 ml-0 sm:ml-[3.25rem] pl-3 border-l-2 border-score-amber/50">
          {head && <p className="text-base font-bold text-floodlight mb-1 break-keep">{head}</p>}
          {pos && <p className="text-xs text-floodlight/55 mb-3">{pos}{r.detail?.captain ? " · 주장" : ""}{r.substitute ? " · 교체 투입" : " · 선발"}</p>}
          {groups.length > 0 ? (
            <div className="space-y-3">
              {groups.map((g) => (
                <div key={g.title}>
                  <p className="text-[11px] font-bold tracking-wider text-floodlight/45 mb-1.5">{g.title}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.tiles.map((t) => (
                      <div
                        key={t.label}
                        className={`min-w-[4.5rem] px-3 py-1.5 border ${t.strong ? "border-score-amber/60 bg-score-amber/10" : "border-turf-line/60 bg-turf/30"}`}
                      >
                        <p className={`font-data text-lg leading-tight ${t.strong ? "text-score-amber font-bold" : "text-floodlight"}`}>{t.value}</p>
                        <p className="text-[11px] text-floodlight/60 whitespace-nowrap">{t.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-floodlight/55">이 경기는 선수별 세부 기록이 제공되지 않아요.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <Link href={r.matchHref} className="text-score-amber hover:underline">경기 상세 보기 →</Link>
            <Link href={`/players/${r.playerId}`} className="text-floodlight/60 hover:text-floodlight">선수 페이지 →</Link>
          </div>
        </div>
      )}
    </li>
  )
}
