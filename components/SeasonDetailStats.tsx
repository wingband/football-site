"use client"

import { useState } from "react"
import type { PlayerSeasonStat } from "@/lib/playerData"

// 선수 페이지 "시즌 상세 통계" (2026-10-17): 합계 / 90분당 전환. 출전 시간이 적은 선수는 90분당 수치가 부풀 수 있어 270분 미만이면 안내를 붙인다.
function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-turf-line/20 last:border-b-0 text-sm">
      <span className="text-floodlight/75">{label}</span>
      <span className="font-data font-medium">
        {value}
        {sub && <span className="text-xs text-floodlight/45 font-sans">{sub}</span>}
      </span>
    </div>
  )
}

export default function SeasonDetailStats({ stat, season }: { stat: PlayerSeasonStat; season: number }) {
  const [per90, setPer90] = useState(false)
  const minutes = stat.games.minutes ?? 0
  const canPer90 = minutes > 0

  const v = (n: number | null) => {
    if (n === null) return "-"
    if (!per90) return String(n)
    return ((n * 90) / minutes).toFixed(1)
  }
  const pct = (a: number | null, b: number | null) => (a !== null && b !== null && b > 0 ? ` (${Math.round((a / b) * 100)}%)` : "")

  return (
    <div className="border-t border-turf-line/50 pt-4">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <p className="text-base font-semibold">
          시즌 상세 통계
          <span className="text-xs text-floodlight/65 ml-2">{stat.league.name} {season}/{season + 1}</span>
        </p>
        {canPer90 && (
          <div className="ml-auto flex text-xs">
            <button
              type="button"
              onClick={() => setPer90(false)}
              className={`px-3 py-1.5 border transition-colors ${!per90 ? "bg-score-amber text-pitch-night border-score-amber font-bold" : "border-turf-line text-floodlight/70 hover:text-floodlight"}`}
            >
              합계
            </button>
            <button
              type="button"
              onClick={() => setPer90(true)}
              className={`px-3 py-1.5 border -ml-px transition-colors ${per90 ? "bg-score-amber text-pitch-night border-score-amber font-bold" : "border-turf-line text-floodlight/70 hover:text-floodlight"}`}
            >
              90분당
            </button>
          </div>
        )}
      </div>
      {per90 && (
        <p className="text-xs text-floodlight/55 mb-3">
          출전 {minutes}분 기준 90분당 환산{minutes < 270 ? " · 출전 시간이 적어 수치가 실제보다 크게 보일 수 있어요" : ""}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
        <div>
          <p className="text-xs text-floodlight/65 mb-1">공격</p>
          <Row label="득점" value={v(stat.goals.total)} />
          <Row label="도움" value={v(stat.goals.assists)} />
          <Row label="슈팅" value={v(stat.shots.total)} />
          <Row label="유효 슈팅" value={v(stat.shots.on)} sub={per90 ? "" : pct(stat.shots.on, stat.shots.total)} />
        </div>
        <div>
          <p className="text-xs text-floodlight/65 mb-1 mt-4 sm:mt-0">패스</p>
          <Row label="패스" value={v(stat.passes.total)} />
          <Row label="키패스" value={v(stat.passes.key)} />
          <Row label="패스 성공률" value={stat.passes.accuracy ? `${stat.passes.accuracy}%` : "-"} />
        </div>
        <div>
          <p className="text-xs text-floodlight/65 mb-1 mt-4">점유</p>
          <Row label="드리블 성공" value={v(stat.dribbles.success)} sub={per90 ? "" : pct(stat.dribbles.success, stat.dribbles.attempts)} />
          <Row label="드리블 시도" value={v(stat.dribbles.attempts)} />
          <Row label="경합 승리" value={v(stat.duels.won)} sub={per90 ? "" : pct(stat.duels.won, stat.duels.total)} />
          <Row label="경합 시도" value={v(stat.duels.total)} />
          <Row label="파울 유도" value={v(stat.fouls.drawn)} />
        </div>
        <div>
          <p className="text-xs text-floodlight/65 mb-1 mt-4">수비 · 규율</p>
          <Row label="태클" value={v(stat.tackles.total)} />
          <Row label="가로채기" value={v(stat.tackles.interceptions)} />
          <Row label="블록" value={v(stat.tackles.blocks)} />
          <Row label="파울" value={v(stat.fouls.committed)} />
          <Row label="경고 / 퇴장" value={`${stat.cards.yellow ?? 0} / ${stat.cards.red ?? 0}`} />
        </div>
      </div>
    </div>
  )
}
