"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Logo from "@/components/Logo"
import PlayerAvatar from "@/components/PlayerAvatar"

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

function RatingBadge({ rating }: { rating: string | null }) {
  if (!rating) return <span className="text-floodlight/40 text-xs font-data">–</span>
  const n = parseFloat(rating)
  const bg = n >= 7.5 ? "bg-green-600" : n >= 6.5 ? "bg-orange-500" : "bg-red-700"
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold text-white font-data ${bg}`}>
      {n.toFixed(2)}
    </span>
  )
}

function PlayerRow({ p }: { p: Player }) {
  return (
    <Link
      href={`/players/${p.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-score-amber/5 transition-colors border-b border-turf-line/30 last:border-b-0 group"
    >
      {/* 사진 */}
      <PlayerAvatar
        src={`https://media.api-sports.io/football/players/${p.id}.png`}
        alt={p.name}
        className="w-9 h-9 rounded-full object-cover bg-turf-line shrink-0"
      />

      {/* 이름 + 팀 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-floodlight group-hover:text-score-amber transition-colors truncate">
          {p.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Logo src={p.teamLogo} alt="" className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs text-floodlight/60 truncate">{p.teamName}</span>
          <span className="text-floodlight/30 text-xs">·</span>
          <span className="text-xs text-floodlight/40 truncate">{p.league}</span>
        </div>
      </div>

      {/* 스탯 */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-center w-8">
          <p className={`text-sm font-bold font-data ${p.goals > 0 ? "text-score-amber" : "text-floodlight/40"}`}>
            {p.goals}
          </p>
          <p className="text-[10px] text-floodlight/40">골</p>
        </div>
        <div className="text-center w-8">
          <p className={`text-sm font-bold font-data ${p.assists > 0 ? "text-floodlight/90" : "text-floodlight/40"}`}>
            {p.assists}
          </p>
          <p className="text-[10px] text-floodlight/40">도움</p>
        </div>
        <div className="text-center w-8">
          <p className="text-sm font-bold font-data text-floodlight/60">
            {p.apps > 0 ? p.apps : "–"}
          </p>
          <p className="text-[10px] text-floodlight/40">경기</p>
        </div>
        <div className="w-12 text-right">
          <RatingBadge rating={p.rating} />
        </div>
      </div>
    </Link>
  )
}

export default function KoreanAbroadWidget() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
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
    <div className="bg-turf/40 border border-turf-line/50 overflow-hidden">
      {/* 클릭해서 열고 닫는 헤더 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-turf-line/20 transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🇰🇷</span>
          <span className="font-display uppercase text-sm text-score-amber tracking-wide">
            한국인 해외파 트래커
          </span>
          {!loading && (
            <span className="text-xs text-floodlight/50 font-data bg-turf-line/40 px-2 py-0.5 rounded-full">
              {players.length}명
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* 5대리그 선수 평점 미리보기 (닫힌 상태) */}
          {!open && !loading && big5.length > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              {big5.filter(p => p.rating).slice(0, 4).map(p => (
                <div key={p.id} className="flex items-center gap-1.5">
                  <PlayerAvatar
                    src={`https://media.api-sports.io/football/players/${p.id}.png`}
                    alt={p.name}
                    className="w-6 h-6 rounded-full object-cover bg-turf-line"
                  />
                  <span className="text-xs text-floodlight/70 font-medium">{p.name}</span>
                  <RatingBadge rating={p.rating} />
                </div>
              ))}
              {big5.length > 4 && (
                <span className="text-xs text-floodlight/40">+{big5.length - 4}명</span>
              )}
            </div>
          )}
          <span className="flex items-center gap-1 text-score-amber text-xs font-medium bg-score-amber/15 border border-score-amber/50 rounded-full px-3 py-1 group-hover:bg-score-amber/25 transition-colors">
            {open ? "접기" : "펼치기"}
            <span className="text-[10px]">{open ? "▲" : "▼"}</span>
          </span>
        </div>
      </button>

      {/* 펼쳐지는 영역 */}
      {open && (
        <div className="border-t border-turf-line/40">
          {/* 탭 + 컬럼 헤더 */}
          <div className="flex items-center justify-between px-4 py-2 bg-turf/60 border-b border-turf-line/30">
            {/* 탭 */}
            <div className="flex gap-1">
              {(["all", "big5", "etc"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-score-amber text-pitch-night font-bold"
                      : "text-floodlight/60 hover:text-floodlight"
                  }`}
                >
                  {tab === "all" ? "전체" : tab === "big5" ? "5대리그" : "주목"}
                </button>
              ))}
            </div>
            {/* 컬럼 헤더 */}
            <div className="flex items-center gap-4 pr-1">
              <span className="text-xs text-floodlight/50 w-8 text-center">골</span>
              <span className="text-xs text-floodlight/50 w-8 text-center">도움</span>
              <span className="text-xs text-floodlight/50 w-8 text-center">경기</span>
              <span className="text-xs text-floodlight/50 w-12 text-right">평점</span>
            </div>
          </div>

          {/* 선수 목록 */}
          {loading ? (
            <div className="p-6 text-center text-floodlight/50 text-sm">불러오는 중...</div>
          ) : (
            <div>
              {/* 5대 리그 그룹 */}
              {(activeTab === "all" || activeTab === "big5") && big5.length > 0 && (
                <>
                  {activeTab === "all" && (
                    <div className="px-4 py-2 bg-score-amber/8">
                      <span className="text-xs font-bold text-score-amber tracking-widest uppercase">
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
                    <div className="px-4 py-2 bg-turf-line/15 border-t border-turf-line/30">
                      <span className="text-xs font-bold text-floodlight/60 tracking-widest uppercase">
                        주목 선수 (Championship · 기타)
                      </span>
                    </div>
                  )}
                  {etc.map((p) => <PlayerRow key={p.id} p={p} />)}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
