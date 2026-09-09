"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Logo from "@/components/Logo"
import { matchHref, teamHref } from "@/lib/slug"
import type { PlayerRecentMatch } from "@/lib/playerData"

type CareerEntry = {
  teamId: number
  teamName: string
  teamLogo: string
  seasons: number[]
  apps: number
  goals: number
}

// /players/[id] 페이지의 "최근 경기"/"경력" 섹션.
// 서버 렌더링 시점엔 아무 것도 안 부르고, 브라우저에 마운트된 뒤에만
// /api/players/[id]/extra를 호출한다 — 이 두 항목이 원래 페이지 하나당
// 최대 14콜(career 5 + recentMatches 1+8)로 제일 비쌌는데, HTML만 긁는
// 봇/스크래퍼는 이 useEffect 자체가 안 돌아서 호출을 안 태우게 된다
export default function PlayerCareerRecent({
  playerId,
  season,
  teamId,
  nationality,
}: {
  playerId: string
  season: number
  teamId: number | null
  nationality: string
}) {
  const [career, setCareer] = useState<CareerEntry[] | null>(null)
  const [recentMatches, setRecentMatches] = useState<PlayerRecentMatch[] | null>(null)

  useEffect(() => {
    let cancelled = false
    const qs = new URLSearchParams({ season: String(season) })
    if (teamId) qs.set("teamId", String(teamId))

    fetch(`/api/players/${playerId}/extra?${qs.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        setCareer(data.career ?? [])
        setRecentMatches(data.recentMatches ?? [])
      })
      .catch(() => {
        if (cancelled) return
        setCareer([])
        setRecentMatches([])
      })

    return () => {
      cancelled = true
    }
    // playerId/season/teamId는 페이지 전환마다 새로 마운트되므로 의존성 배열 그대로 둠
  }, [playerId, season, teamId])

  const clubCareer = career?.filter((c) => c.teamName !== nationality) ?? []
  const nationalCareer = career?.filter((c) => c.teamName === nationality) ?? []

  return (
    <>
      {/* ── 최근 경기 ── */}
      {recentMatches === null ? (
        <div className="py-6 border-b border-turf-line/30">
          <p className="text-sm font-medium mb-3">최근 경기</p>
          <div className="h-24 animate-pulse bg-turf-line/10 rounded" />
        </div>
      ) : recentMatches.length > 0 ? (
        <div className="py-6 border-b border-turf-line/30">
          <p className="text-sm font-medium mb-3">최근 경기</p>
          <div className="divide-y divide-turf-line/20">
            {recentMatches.map((m) => (
              <Link
                key={m.fixture.id}
                href={matchHref(m)}
                className="flex items-center gap-3 py-2.5 hover:bg-turf-line/20 transition-colors -mx-1 px-1"
              >
                <span className="text-[11px] text-floodlight/40 w-14 shrink-0">
                  {new Date(m.fixture.date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                </span>
                <Logo src={m.teams.home.logo} alt="" className="w-4 h-4 shrink-0" />
                <span className="text-xs flex-1 truncate">
                  {m.teams.home.name} {m.goals.home}-{m.goals.away} {m.teams.away.name}
                </span>
                <Logo src={m.teams.away.logo} alt="" className="w-4 h-4 shrink-0" />
                <span className="text-[11px] text-floodlight/40 w-8 text-right shrink-0">
                  {m.stat.games.minutes ?? "-"}&apos;
                </span>
                {(m.stat.goals.total ?? 0) > 0 && <span className="shrink-0 text-xs">⚽{m.stat.goals.total}</span>}
                {(m.stat.goals.assists ?? 0) > 0 && <span className="shrink-0 text-xs">🅰️{m.stat.goals.assists}</span>}
                {m.stat.games.rating && (
                  <span className="text-xs font-data font-bold bg-green-600/20 text-green-400 px-1.5 py-0.5 rounded shrink-0">
                    {m.stat.games.rating}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── 경력 ── */}
      {career === null ? (
        <div className="py-6 border-b border-turf-line/30">
          <p className="text-sm font-medium mb-3">경력</p>
          <div className="h-20 animate-pulse bg-turf-line/10 rounded" />
        </div>
      ) : clubCareer.length > 0 || nationalCareer.length > 0 ? (
        <div className="py-6 border-b border-turf-line/30">
          <p className="text-sm font-medium mb-3">경력</p>
          {clubCareer.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-floodlight/40 mb-2">클럽</p>
              <div className="divide-y divide-turf-line/20">
                {clubCareer.map((c) => (
                  <Link
                    key={c.teamId}
                    href={teamHref(c.teamId)}
                    className="flex items-center gap-3 py-2 hover:bg-turf-line/20 transition-colors -mx-1 px-1"
                  >
                    <Logo src={c.teamLogo} alt="" className="w-6 h-6 shrink-0" />
                    <span className="text-sm flex-1 truncate">{c.teamName}</span>
                    <span className="text-xs text-floodlight/40 font-data shrink-0 w-20 text-right">
                      {Math.min(...c.seasons)}/{String(Math.max(...c.seasons) + 1).slice(2)}
                    </span>
                    <span className="text-xs text-floodlight/30 font-data shrink-0 w-24 text-right">
                      {c.apps}경기 {c.goals}골
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {nationalCareer.length > 0 && (
            <div>
              <p className="text-xs text-floodlight/40 mb-2">국가대표</p>
              <div className="divide-y divide-turf-line/20">
                {nationalCareer.map((c) => (
                  <div key={c.teamId} className="flex items-center gap-3 py-2">
                    <Logo src={c.teamLogo} alt="" className="w-6 h-6 shrink-0" />
                    <span className="text-sm flex-1 truncate">{c.teamName}</span>
                    <span className="text-xs text-floodlight/30 font-data shrink-0 w-24 text-right">
                      {c.apps}경기 {c.goals}골
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </>
  )
}
