"use client"

import { useEffect, useState } from "react"
import type { XGData } from "@/app/api/xg/route"

interface Props {
  homeTeam: string
  awayTeam: string
  date: string
  leagueId: number
  homeGoals: number | null
  awayGoals: number | null
}

export default function XGPanel({ homeTeam, awayTeam, date, leagueId, homeGoals, awayGoals }: Props) {
  const [xg, setXg] = useState<XGData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const dateStr = date.slice(0, 10)
    fetch(`/api/xg?home=${encodeURIComponent(homeTeam)}&away=${encodeURIComponent(awayTeam)}&date=${dateStr}&league=${leagueId}`)
      .then((r) => r.json())
      .then((data) => setXg(data.xg ?? null))
      .catch(() => setXg(null))
      .finally(() => setLoading(false))
  }, [homeTeam, awayTeam, date, leagueId])

  if (loading) {
    return (
      <div className="bg-turf/40 border border-turf-line/30 p-4 animate-pulse">
        <div className="h-4 bg-turf-line/30 rounded w-24 mb-3" />
        <div className="h-8 bg-turf-line/30 rounded" />
      </div>
    )
  }

  if (!xg) return null

  const homeXg = xg.home.xg
  const awayXg = xg.away.xg
  const total = homeXg + awayXg
  const homeWidth = total > 0 ? (homeXg / total) * 100 : 50
  const awayWidth = total > 0 ? (awayXg / total) * 100 : 50

  // xG 색상: 실제 골보다 높으면 초록(기회 많았음), 낮으면 주황
  const homeXgColor = homeGoals !== null && homeXg > homeGoals ? "text-green-400" : "text-score-amber"
  const awayXgColor = awayGoals !== null && awayXg > awayGoals ? "text-green-400" : "text-score-amber"

  return (
    <div className="bg-turf/40 border border-turf-line/30 p-4 space-y-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-floodlight/40 uppercase tracking-wide font-display">
          기대 골 (xG)
        </p>
        <span className="text-[10px] text-floodlight/25">
          via {xg.source === "sofascore" ? "Sofascore" : "Understat"}
        </span>
      </div>

      {/* xG 바 */}
      <div>
        <div className="flex justify-between text-sm mb-1.5">
          <span className={`font-bold font-data text-lg ${homeXgColor}`}>{homeXg.toFixed(2)}</span>
          <span className={`font-bold font-data text-lg ${awayXgColor}`}>{awayXg.toFixed(2)}</span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden bg-turf-line/30">
          <div
            className="bg-score-amber transition-all duration-700"
            style={{ width: `${homeWidth}%` }}
          />
          <div
            className="bg-floodlight/40 transition-all duration-700"
            style={{ width: `${awayWidth}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-floodlight/40 mt-1">
          <span>{homeTeam}</span>
          <span>{awayTeam}</span>
        </div>
      </div>

      {/* 빅 찬스 (Sofascore에서만) */}
      {xg.source === "sofascore" && (xg.home.bigChances !== undefined || xg.away.bigChances !== undefined) && (
        <div>
          <p className="text-[10px] text-floodlight/40 uppercase tracking-wide mb-1.5">빅 찬스</p>
          <div className="flex justify-between items-center">
            <span className="font-bold font-data text-floodlight">{xg.home.bigChances ?? 0}</span>
            <span className="text-[10px] text-floodlight/30">Big Chances</span>
            <span className="font-bold font-data text-floodlight">{xg.away.bigChances ?? 0}</span>
          </div>
        </div>
      )}

      {/* 점유율 (Sofascore에서만) */}
      {xg.source === "sofascore" && xg.homePossession && xg.awayPossession && (
        <div>
          <p className="text-[10px] text-floodlight/40 uppercase tracking-wide mb-1.5">점유율</p>
          <div className="flex h-1.5 rounded-full overflow-hidden bg-turf-line/30">
            <div className="bg-score-amber" style={{ width: `${xg.homePossession}%` }} />
            <div className="bg-floodlight/40" style={{ width: `${xg.awayPossession}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-floodlight/50 mt-1 font-data">
            <span>{xg.homePossession}%</span>
            <span>{xg.awayPossession}%</span>
          </div>
        </div>
      )}

      {/* xG 해석 */}
      <div className="text-[10px] text-floodlight/25 border-t border-turf-line/20 pt-2">
        xG = 기대 골. 슛의 질(거리·각도·상황)을 토대로 얼마나 득점할 가능성이 있었는지 나타냅니다.
        {homeGoals !== null && awayGoals !== null && (
          <span className="block mt-0.5">
            실제 결과 {homeGoals}-{awayGoals} vs xG {homeXg.toFixed(2)}-{awayXg.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  )
}
