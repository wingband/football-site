import Link from "next/link"
import Logo from "@/components/Logo"
import PlayerAvatar from "@/components/PlayerAvatar"
import { matchLinkHref } from "@/lib/slug"
import { formatKickoffKst, koLeague, koTeam, type PlayerWeek } from "@/lib/koreanWeekly"

// 해외파 허브: "이번 주 경기 일정" + "최근 7일 활약". /korean-players 상단에 들어간다.
// (2026-10-10) "손흥민 오늘 경기", "이강인 경기 일정" 같은 매일 반복되는 검색을
// 한 페이지에서 받기 위한 섹션 — 다른 사이트엔 이렇게 모아둔 곳이 없다.

const RESULT_STYLE: Record<string, string> = {
  W: "bg-emerald-500/20 text-emerald-300",
  D: "bg-floodlight/10 text-floodlight/60",
  L: "bg-red-500/20 text-red-300",
}
const RESULT_LABEL: Record<string, string> = { W: "승", D: "무", L: "패" }

function ratingColor(r: number | null) {
  if (r === null) return "text-floodlight/40"
  if (r >= 7.5) return "text-emerald-300"
  if (r >= 6.8) return "text-score-amber"
  return "text-floodlight/70"
}

export default function KoreanWeekHub({ weeks }: { weeks: PlayerWeek[] }) {
  const upcoming = weeks
    .filter((w) => w.next)
    .sort((a, b) => new Date(a.next!.date).getTime() - new Date(b.next!.date).getTime())

  const performances = weeks
    .flatMap((w) => w.recent.map((m) => ({ w, m })))
    .sort((a, b) => new Date(b.m.date).getTime() - new Date(a.m.date).getTime())

  const best = performances
    .filter(({ m }) => m.played && m.rating !== null)
    .sort((a, b) => (b.m.rating! - a.m.rating!) || (b.m.goals + b.m.assists - a.m.goals - a.m.assists))[0]

  const noMatch = weeks.filter((w) => w.recent.length === 0)

  return (
    <div className="space-y-10 mt-8">
      {/* 이번 주 MVP */}
      {best && (
        <Link
          href={matchLinkHref(best.m.slugSource)}
          className="flex items-center gap-4 p-4 border border-score-amber/40 bg-score-amber/5 hover:bg-score-amber/10 transition-colors"
        >
          <PlayerAvatar
            src={`https://media.api-sports.io/football/players/${best.w.player.id}.png`}
            alt={best.w.player.name}
            className="w-14 h-14 rounded-full object-cover bg-turf-line shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-score-amber font-semibold tracking-wide">최근 7일 해외파 최고 평점</p>
            <p className="text-base font-bold mt-0.5">
              {best.w.player.name}
              <span className="text-sm font-normal text-floodlight/60"> · {best.w.teamNameKo}</span>
            </p>
            <p className="text-xs text-floodlight/50 mt-1">
              vs {koTeam(best.m.opponentName)} ({best.m.homeScore}:{best.m.awayScore}) · {best.m.minutes}분
              {best.m.goals > 0 && ` · ${best.m.goals}골`}
              {best.m.assists > 0 && ` · ${best.m.assists}도움`}
            </p>
          </div>
          <span className={`font-data text-2xl font-bold ${ratingColor(best.m.rating)}`}>{best.m.rating!.toFixed(1)}</span>
        </Link>
      )}

      {/* 다음 경기 일정 */}
      <section>
        <h2 className="font-display uppercase text-base text-floodlight/80 tracking-wide mb-1">해외파 다음 경기 일정</h2>
        <p className="text-xs text-floodlight/40 mb-4">한국 시간 기준 · 선수별 소속팀의 다음 경기</p>
        {upcoming.length === 0 ? (
          <p className="text-sm text-floodlight/40 py-6">예정된 경기 정보를 불러오지 못했습니다.</p>
        ) : (
          <ul className="divide-y divide-turf-line/30 border-y border-turf-line/30">
            {upcoming.map(({ player, teamNameKo, next }) => (
              <li key={player.id}>
                <Link href={matchLinkHref(next!.slugSource)} className="flex items-center gap-3 py-3 hover:bg-turf-line/10 transition-colors group">
                  <span className="w-[118px] shrink-0 text-xs text-floodlight/60 font-data">{formatKickoffKst(next!.date)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold group-hover:text-score-amber transition-colors">
                      {player.name}
                      <span className="font-normal text-floodlight/50"> · {teamNameKo}</span>
                    </p>
                    <p className="text-xs text-floodlight/50 mt-0.5 flex items-center gap-1.5">
                      <Logo src={next!.isHome ? next!.awayLogo : next!.homeLogo} alt="" className="w-3.5 h-3.5 shrink-0" />
                      vs {koTeam(next!.opponentName)} ({next!.isHome ? "홈" : "원정"}) · {koLeague(next!.leagueName)}
                    </p>
                  </div>
                  <span className="text-floodlight/30 text-sm group-hover:text-score-amber">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 최근 7일 활약 */}
      <section>
        <h2 className="font-display uppercase text-base text-floodlight/80 tracking-wide mb-1">최근 7일 해외파 활약</h2>
        <p className="text-xs text-floodlight/40 mb-4">경기별 출전 시간 · 평점 · 공격포인트</p>
        {performances.length === 0 ? (
          <p className="text-sm text-floodlight/40 py-6">최근 7일 동안 치른 공식 경기가 없습니다. (A매치 휴식기일 수 있어요)</p>
        ) : (
          <ul className="space-y-2">
            {performances.map(({ w, m }) => (
              <li key={`${w.player.id}-${m.fixtureId}`}>
                <Link
                  href={matchLinkHref(m.slugSource)}
                  className="flex items-center gap-3 p-3 bg-turf/30 border border-turf-line/30 hover:border-score-amber/40 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold group-hover:text-score-amber transition-colors">
                      {w.player.name}
                      {m.goals > 0 && <span className="ml-1.5 text-xs text-emerald-300">⚽×{m.goals}</span>}
                      {m.assists > 0 && <span className="ml-1.5 text-xs text-sky-300">🅰️×{m.assists}</span>}
                      {m.red > 0 && <span className="ml-1.5 text-xs">🟥</span>}
                    </p>
                    <p className="text-xs text-floodlight/50 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      {m.result && (
                        <span className={`px-1.5 rounded text-[10px] font-bold ${RESULT_STYLE[m.result]}`}>{RESULT_LABEL[m.result]}</span>
                      )}
                      <span>
                        {koTeam(m.homeName)} {m.homeScore}:{m.awayScore} {koTeam(m.awayName)}
                      </span>
                      <span className="text-floodlight/30">·</span>
                      <span>{formatKickoffKst(m.date).split(" ").slice(0, 3).join(" ")}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {m.played ? (
                      <>
                        <p className={`font-data text-lg font-bold leading-none ${ratingColor(m.rating)}`}>
                          {m.rating !== null ? m.rating.toFixed(1) : "-"}
                        </p>
                        <p className="text-[10px] text-floodlight/40 mt-1">
                          {m.minutes}분{m.substitute ? " (교체)" : ""}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-floodlight/40">{m.statsAvailable ? "미출전" : "기록 미제공"}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {noMatch.length > 0 && performances.length > 0 && (
          <p className="text-[11px] text-floodlight/35 mt-3">
            최근 7일 경기 없음: {noMatch.map((w) => w.player.name).join(", ")}
          </p>
        )}
      </section>
    </div>
  )
}
