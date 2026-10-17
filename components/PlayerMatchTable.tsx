"use client"

import Link from "next/link"
import { useState } from "react"
import Logo from "@/components/Logo"
import PlayerMatchDetailModal, { ratingColorOf, RESULT_LABEL_OF, RESULT_STYLE_OF, type RecentRowData } from "@/components/PlayerMatchDetailModal"
import { matchLinkHref } from "@/lib/slug"
import { koLeague, koTeam } from "@/lib/koreanWeekly"
import type { PlayerRecentMatch } from "@/lib/playerData"

// 선수 페이지 "경기별 기록" 표 (2026-10-17). 날짜·대회·상대·결과·출전·골·도움·카드·평점을 열로 정리하고,
// 줄을 누르면 그 경기의 선수 상세 팝업이 뜬다. 상대 팀 칸의 링크는 경기 상세 페이지로 간다.

function toRow(m: PlayerRecentMatch, playerId: number, name: string, photo: string, teamId: number | null): RecentRowData {
  const isHome = teamId !== null ? m.teams.home.id === teamId : true
  const mine = isHome ? m.teams.home : m.teams.away
  const opp = isHome ? m.teams.away : m.teams.home
  const myScore = isHome ? m.goals.home : m.goals.away
  const oppScore = isHome ? m.goals.away : m.goals.home
  const result = myScore === null || oppScore === null ? null : myScore > oppScore ? "W" : myScore < oppScore ? "L" : "D"
  const s = m.stat
  return {
    playerId,
    name,
    teamKo: koTeam(mine.name),
    photo,
    goals: s.goals.total ?? 0,
    assists: s.goals.assists ?? 0,
    red: s.cards.red ?? 0,
    yellow: s.cards.yellow ?? 0,
    result,
    myScore,
    oppScore,
    oppKo: koTeam(opp.name),
    isHome,
    leagueKo: koLeague(m.league.name),
    rating: s.games.rating ? Number(s.games.rating) : null,
    minutes: s.games.minutes,
    substitute: s.games.substitute,
    matchHref: matchLinkHref(m),
    detail: {
      position: s.games.position,
      captain: s.games.captain,
      shots: s.shots.total,
      shotsOn: s.shots.on,
      passes: s.passes.total,
      keyPasses: s.passes.key,
      dribbleAttempts: s.dribbles.attempts,
      dribbleSuccess: s.dribbles.success,
      tackles: s.tackles.total,
      interceptions: s.tackles.interceptions,
      blocks: s.tackles.blocks,
      duels: s.duels.total,
      duelsWon: s.duels.won,
      foulsDrawn: s.fouls.drawn,
      foulsCommitted: s.fouls.committed,
      saves: s.goals.saves,
      conceded: s.goals.conceded,
    },
  }
}

export default function PlayerMatchTable({
  matches,
  playerId,
  name,
  photo,
  teamId,
}: {
  matches: PlayerRecentMatch[]
  playerId: number
  name: string
  photo: string
  teamId: number | null
}) {
  const [openId, setOpenId] = useState<number | null>(null)
  const rows = matches.map((m) => ({ m, r: toRow(m, playerId, name, photo, teamId) }))
  const open = rows.find((x) => x.m.fixture.id === openId)

  const th = "py-2 text-[11px] font-semibold text-floodlight/50 whitespace-nowrap"
  const td = "py-2.5 text-sm whitespace-nowrap"

  return (
    <>
      {/* 모바일: 표 대신 카드 줄 (가로 스크롤 없이 핵심만) */}
      <ul className="sm:hidden divide-y divide-turf-line/20">
        {rows.map(({ m, r }) => {
          const opp = r.isHome ? m.teams.away : m.teams.home
          const played = (r.minutes ?? 0) > 0
          return (
            <li key={m.fixture.id}>
              <div
                role={played ? "button" : undefined}
                tabIndex={played ? 0 : undefined}
                onClick={() => played && setOpenId(m.fixture.id)}
                onKeyDown={(e) => played && (e.key === "Enter" || e.key === " ") && setOpenId(m.fixture.id)}
                className={`flex items-center gap-3 py-2.5 ${played ? "cursor-pointer active:bg-turf-line/20" : "opacity-60"}`}
              >
                <div className="w-12 shrink-0 leading-tight">
                  <p className="font-data text-xs text-floodlight/70">
                    {new Date(m.fixture.date).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" })}
                  </p>
                  <p className="text-[10px] text-floodlight/40 truncate">{r.leagueKo}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={r.matchHref}
                    prefetch={false}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-sm text-floodlight hover:text-score-amber"
                    title="경기 상세 보기"
                  >
                    <Logo src={opp.logo} alt="" className="w-4 h-4 shrink-0" />
                    <span className="truncate">{r.oppKo}</span>
                    <span className="text-[10px] text-floodlight/40 shrink-0">{r.isHome ? "홈" : "원정"}</span>
                  </Link>
                  <p className="mt-0.5 text-xs text-floodlight/70 flex items-center gap-1.5 flex-wrap">
                    {r.result && <span className={`px-1.5 rounded text-[11px] font-bold ${RESULT_STYLE_OF[r.result]}`}>{RESULT_LABEL_OF[r.result]}</span>}
                    <span className="font-data">{r.myScore ?? "-"}:{r.oppScore ?? "-"}</span>
                    <span className="text-floodlight/40">·</span>
                    <span className="font-data">{played ? `${r.minutes}'${r.substitute ? " 교체" : ""}` : "결장"}</span>
                    {r.goals > 0 && <span className="text-emerald-300">⚽{r.goals}</span>}
                    {r.assists > 0 && <span className="text-sky-300">🅰️{r.assists}</span>}
                    {r.yellow > 0 && <span className="inline-block w-2 h-3 bg-yellow-400 rounded-[2px]" aria-label="경고" />}
                    {r.red > 0 && <span className="inline-block w-2 h-3 bg-red-500 rounded-[2px]" aria-label="퇴장" />}
                  </p>
                </div>
                <div className="shrink-0">
                  {r.rating !== null ? (
                    <span className={`inline-block min-w-[2.6rem] text-center px-1.5 py-0.5 rounded font-data font-bold bg-turf-line/30 ${ratingColorOf(r.rating)}`}>{r.rating.toFixed(1)}</span>
                  ) : (
                    <span className="text-floodlight/30 text-sm">-</span>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="hidden sm:block overflow-x-auto -mx-1">
        <table className="w-full min-w-[34rem] text-left">
          <thead className="border-b border-turf-line/40">
            <tr>
              <th className={`${th} pl-1`}>날짜</th>
              <th className={th}>상대</th>
              <th className={`${th} text-center`}>결과</th>
              <th className={`${th} text-right`}>출전</th>
              <th className={`${th} text-right`}>골</th>
              <th className={`${th} text-right`}>도움</th>
              <th className={`${th} text-center`}>카드</th>
              <th className={`${th} text-right pr-1`}>평점</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-turf-line/20">
            {rows.map(({ m, r }) => {
              const opp = r.isHome ? m.teams.away : m.teams.home
              const played = (r.minutes ?? 0) > 0
              return (
                <tr
                  key={m.fixture.id}
                  onClick={() => played && setOpenId(m.fixture.id)}
                  className={`${played ? "cursor-pointer hover:bg-turf-line/20" : "opacity-60"} transition-colors`}
                  title={played ? `${name} 이 경기 상세` : "출전 기록 없음"}
                >
                  <td className={`${td} pl-1 text-floodlight/70 font-data`}>
                    {new Date(m.fixture.date).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" })}
                    <span className="block text-[10px] text-floodlight/40 font-sans">{r.leagueKo}</span>
                  </td>
                  <td className={td}>
                    <Link
                      href={r.matchHref}
                      prefetch={false}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 hover:text-score-amber transition-colors"
                      title="경기 상세 보기"
                    >
                      <Logo src={opp.logo} alt="" className="w-4 h-4 shrink-0" />
                      <span className="truncate max-w-[9rem]">{r.oppKo}</span>
                      <span className="text-[10px] text-floodlight/40">{r.isHome ? "홈" : "원정"}</span>
                    </Link>
                  </td>
                  <td className={`${td} text-center`}>
                    {r.result && <span className={`mr-1 px-1.5 rounded text-[11px] font-bold ${RESULT_STYLE_OF[r.result]}`}>{RESULT_LABEL_OF[r.result]}</span>}
                    <span className="font-data">{r.myScore ?? "-"}:{r.oppScore ?? "-"}</span>
                  </td>
                  <td className={`${td} text-right font-data text-floodlight/80`}>
                    {played ? `${r.minutes}'` : "-"}
                    {played && r.substitute && <span className="text-[10px] text-floodlight/40 ml-0.5">교체</span>}
                  </td>
                  <td className={`${td} text-right font-data ${r.goals > 0 ? "text-emerald-300 font-bold" : "text-floodlight/40"}`}>{r.goals}</td>
                  <td className={`${td} text-right font-data ${r.assists > 0 ? "text-sky-300 font-bold" : "text-floodlight/40"}`}>{r.assists}</td>
                  <td className={`${td} text-center`}>
                    {r.yellow > 0 && <span className="inline-block w-2.5 h-3.5 bg-yellow-400 rounded-[2px] align-middle mr-0.5" aria-label="경고" />}
                    {r.red > 0 && <span className="inline-block w-2.5 h-3.5 bg-red-500 rounded-[2px] align-middle" aria-label="퇴장" />}
                    {r.yellow === 0 && r.red === 0 && <span className="text-floodlight/30">-</span>}
                  </td>
                  <td className={`${td} text-right pr-1`}>
                    {r.rating !== null ? (
                      <span className={`inline-block min-w-[2.6rem] text-center px-1.5 py-0.5 rounded font-data font-bold bg-turf-line/30 ${ratingColorOf(r.rating)}`}>{r.rating.toFixed(1)}</span>
                    ) : (
                      <span className="text-floodlight/30">-</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-floodlight/45">줄을 누르면 그 경기 세부 기록 · 상대 팀을 누르면 경기 상세</p>
      {open && <PlayerMatchDetailModal r={open.r} onClose={() => setOpenId(null)} />}
    </>
  )
}
