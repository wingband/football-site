"use client"

import Link from "next/link"
import { useEffect } from "react"
import PlayerAvatar from "@/components/PlayerAvatar"
import type { MatchDetail } from "@/lib/koreanWeekly"

// "이 경기에서의 선수 상세" 팝업 (2026-10-17). 해외파 최근 활약 목록과 선수 페이지의 경기별 기록 표가 함께 쓴다.
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

export function ratingColorOf(r: number | null) {
  return ratingColor(r)
}
export const RESULT_STYLE_OF = RESULT_STYLE
export const RESULT_LABEL_OF = RESULT_LABEL

export function ScoreLine({ r }: { r: RecentRowData }) {
  return (
    <>
      {r.result && <span className={`mr-1.5 px-1.5 rounded text-xs font-bold ${RESULT_STYLE[r.result]}`}>{RESULT_LABEL[r.result]}</span>}
      <span className="font-data">{r.myScore}:{r.oppScore}</span> {r.oppKo}
      <span className="text-floodlight/45"> ({r.isHome ? "홈" : "원정"}) · {r.leagueKo}</span>
    </>
  )
}

export default function PlayerMatchDetailModal({ r, onClose }: { r: RecentRowData; onClose: () => void }) {
  const groups = buildGroups(r)
  const head = headline(r)
  const pos = r.detail?.position ? POS_KO[r.detail.position] ?? r.detail.position : null
  const scoreLine = <ScoreLine r={r} />

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [onClose])

  return (
<div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`${r.name} 경기 상세`}
        >
          <div
            className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-pitch-night border border-turf-line/60 p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <PlayerAvatar src={r.photo} alt={r.name} className="w-14 h-14 rounded-full ring-2 ring-score-amber/60 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-floodlight leading-tight">
                  {r.name} <span className="text-sm font-normal text-floodlight/55">{r.teamKo}</span>
                </p>
                <p className="text-sm text-floodlight/75 mt-1">{scoreLine}</p>
                <p className="text-xs text-floodlight/55 mt-1">
                  {pos ?? ""}{r.detail?.captain ? " · 주장" : ""}{pos ? " · " : ""}{r.substitute ? "교체 투입" : "선발"} {r.minutes}분
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`font-data text-2xl font-bold leading-none ${ratingColor(r.rating)}`}>{r.rating !== null ? r.rating.toFixed(1) : "-"}</p>
                <p className="text-[11px] text-floodlight/55 mt-1">평점</p>
              </div>
              <button type="button" onClick={onClose} className="shrink-0 -mr-1 -mt-1 text-floodlight/50 hover:text-floodlight text-xl leading-none" aria-label="닫기">
                ×
              </button>
            </div>

            {head && <p className="mt-4 text-base font-bold text-score-amber break-keep">{head}</p>}

            <div className="mt-4">
              {groups.length > 0 ? (
                <div className="space-y-4">
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
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link href={r.matchHref} className="text-sm px-4 py-2 bg-score-amber text-pitch-night font-bold rounded-full hover:bg-floodlight transition-colors">
                경기 상세 보기 →
              </Link>
              <Link href={`/players/${r.playerId}`} className="text-sm px-4 py-2 border border-turf-line text-floodlight/80 rounded-full hover:text-floodlight hover:border-floodlight/40 transition-colors">
                {r.name} 선수 페이지
              </Link>
            </div>
          </div>
        </div>
  )
}
