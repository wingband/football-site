"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

// ── 타입 ──────────────────────────────────────────────────────────────────
type Player = {
  id: number
  name: string
  teamName: string
  teamLogo: string
  league: string
  leagueLogo: string
  tier: 1 | 2
  goals: number
  assists: number
  apps: number
  minutes: number
  rating: string | null
}

// ── 평점 배지 ──────────────────────────────────────────────────────────────
function RatingBadge({ rating }: { rating: string | null }) {
  if (!rating) return <span className="text-floodlight/20 text-xs font-data">–</span>
  const n = parseFloat(rating)
  const bg = n >= 7.5 ? "bg-green-600" : n >= 6.5 ? "bg-orange-500" : "bg-red-700"
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold text-white font-data tabular-nums ${bg}`}>
      {n.toFixed(2)}
    </span>
  )
}

// ── 선수 한 줄 ─────────────────────────────────────────────────────────────
function PlayerRow({ p }: { p: Player }) {
  return (
    <Link
      href={`/players/${p.id}`}
      className="flex items-center gap-3 px-3 py-2.5 hover:bg-turf-line/30 transition-colors border-b border-turf-line/20 last:border-b-0 group"
    >
      {/* 선수 사진 */}
      <img
        src={`https://media.api-sports.io/football/players/${p.id}.png`}
        alt={p.name}
        className="w-8 h-8 rounded-full object-cover bg-turf-line shrink-0"
        onError={(e) => {
          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=1a2a1a&color=c8a84b&size=32`
        }}
      />

      {/* 이름 + 팀 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-floodlight group-hover:text-score-amber transition-colors truncate leading-tight">
          {p.name}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <img src={p.teamLogo} alt="" className="w-3 h-3 shrink-0" />
          <span className="text-[10px] text-floodlight/45 truncate">{p.teamName}</span>
        </div>
      </div>

      {/* 스탯: 득점 / 도움 / 출전 */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-center w-7">
          <p className={`text-sm font-bold font-data tabular-nums ${p.goals > 0 ? "text-score-amber" : "text-floodlight/30"}`}>
            {p.goals}
          </p>
          <p className="text-[9px] text-floodlight/30">골</p>
        </div>
        <div className="text-center w-7">
          <p className={`text-sm font-bold font-data tabular-nums ${p.assists > 0 ? "text-floodlight/80" : "text-floodlight/30"}`}>
            {p.assists}
          </p>
          <p className="text-[9px] text-floodlight/30">도움</p>
        </div>
        <div className="text-center w-8">
          <p className="text-sm font-bold font-data tabular-nums text-floodlight/50">
            {p.apps > 0 ? p.apps : "–"}
          </p>
          <p className="text-[9px] text-floodlight/30">경기</p>
        </div>
      </div>

      {/* 평점 */}
      <div className="w-12 text-right shrink-0">
        <RatingBadge rating={p.rating} />
      </div>
    </Link>
  )
}

// ── 메인 위젯 ─────────────────────────────────────────────────────────────
export default function KoreanAbroadWidget() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"all" | "big5" | "etc">("all")

  useEffect(() => {
    fetch("/api/korean-abroad")
      .then((r) => r.json())
      .then((data) => setPlayers(data.players ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const big5 = players.filter((p) => p.tier === 1)
  const etc = players.filter((p) => p.tier === 2)
  const displayed = activeTab === "big5" ? big5 : activeTab === "etc" ? etc : players

  return (
    <div className="bg-turf/30 border border-turf-line/40 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-turf-line/40">
        <div className="flex items-center gap-2">
          <span className="text-base">🇰🇷</span>
          <h2 className="font-display uppercase text-sm text-score-amber tracking-wide">
            한국인 해외파 트래커
          </h2>
          {!loading && (
            <span className="text-[10px] text-floodlight/30 font-data">{players.length}명</span>
          )}
        </div>

        {/* 탭 */}
        <div className="flex gap-1">
          {(["all", "big5", "etc"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-[10px] px-2 py-1 rounded font-medium transition-colors ${
                activeTab === tab
                  ? "bg-score-amber text-pitch-night font-bold"
                  : "text-floodlight/40 hover:text-floodlight/70"
              }`}
            >
              {tab === "all" ? "전체" : tab === "big5" ? "5대리그" : "주목"}
            </button>
          ))}
        </div>
      </div>

      {/* 컬럼 헤더 */}
      <div className="flex items-center gap-3 px-3 py-1.5 bg-turf/50 border-b border-turf-line/20">
        <div className="w-8 shrink-0" />
        <p className="flex-1 text-[9px] uppercase text-floodlight/25 tracking-wide">선수</p>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[9px] uppercase text-floodlight/25 w-7 text-center">골</span>
          <span className="text-[9px] uppercase text-floodlight/25 w-7 text-center">도움</span>
          <span className="text-[9px] uppercase text-floodlight/25 w-8 text-center">경기</span>
        </div>
        <span className="text-[9px] uppercase text-floodlight/25 w-12 text-right shrink-0">평점</span>
      </div>

      {/* 선수 목록 */}
      {loading ? (
        <div className="space-y-px p-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-turf-line/40 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-turf-line/40 rounded w-20" />
                <div className="h-2 bg-turf-line/30 rounded w-14" />
              </div>
              <div className="h-4 bg-turf-line/30 rounded w-20" />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <p className="text-floodlight/30 text-sm p-4 text-center">데이터 없음</p>
      ) : (
        <div>
          {/* 5대리그 그룹 */}
          {(activeTab === "all" || activeTab === "big5") && big5.length > 0 && (
            <>
              {activeTab === "all" && (
                <div className="px-3 py-1.5 bg-score-amber/5 border-b border-turf-line/20">
                  <span className="text-[9px] uppercase text-score-amber/70 font-semibold tracking-widest">
                    5대 리그 1부
                  </span>
                </div>
              )}
              {big5.map((p) => <PlayerRow key={p.id} p={p} />)}
            </>
          )}

          {/* 주목 선수 그룹 */}
          {(activeTab === "all" || activeTab === "etc") && etc.length > 0 && (
            <>
              {activeTab === "all" && (
                <div className="px-3 py-1.5 bg-turf-line/10 border-y border-turf-line/20">
                  <span className="text-[9px] uppercase text-floodlight/30 font-semibold tracking-widest">
                    주목 선수
                  </span>
                </div>
              )}
              {etc.map((p) => <PlayerRow key={p.id} p={p} />)}
            </>
          )}
        </div>
      )}
    </div>
  )
}
