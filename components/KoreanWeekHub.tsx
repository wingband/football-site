import Link from "next/link"
import Logo from "@/components/Logo"
import PlayerAvatar from "@/components/PlayerAvatar"
import { matchLinkHref } from "@/lib/slug"
import AddToCalendar from "@/components/AddToCalendar"
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
  if (r === null) return "text-floodlight/60"
  if (r >= 7.5) return "text-emerald-300"
  if (r >= 6.8) return "text-score-amber"
  return "text-floodlight/70"
}

const CARD = "bg-turf/40 border border-turf-line/60 rounded-2xl p-4 sm:p-5"
const photo = (id: number) => `https://media.api-sports.io/football/players/${id}.png`

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
    <div className="space-y-6">
      {/* 이번 주 최고 평점 */}
      {best && (
        <Link
          href={matchLinkHref(best.m.slugSource)}
          className="flex items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl border border-score-amber/50 bg-score-amber/10 hover:bg-score-amber/15 transition-colors"
        >
          <PlayerAvatar
            src={photo(best.w.player.id)}
            alt={best.w.player.name}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full ring-2 ring-score-amber/80 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-score-amber font-semibold">최근 7일 해외파 최고 평점</p>
            <p className="text-lg sm:text-xl font-bold mt-0.5 text-floodlight">
              {best.w.player.name}
              <span className="text-sm font-normal text-floodlight/75"> · {best.w.teamNameKo}</span>
            </p>
            <p className="text-sm text-floodlight/75 mt-1">
              vs {koTeam(best.m.opponentName)} ({best.m.homeScore}:{best.m.awayScore}) · {best.m.minutes}분
              {best.m.goals > 0 && ` · ${best.m.goals}골`}
              {best.m.assists > 0 && ` · ${best.m.assists}도움`}
            </p>
          </div>
          <span className={`font-data text-3xl sm:text-4xl font-bold ${ratingColor(best.m.rating)}`}>{best.m.rating!.toFixed(1)}</span>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* 다음 경기 일정 */}
        <section className={CARD}>
 <h2 className="text-base font-semibold font-display text-floodlight">다음 경기 일정</h2>
          <p className="text-xs sm:text-sm text-floodlight/70 mt-1 mb-3">
            한국 시간 기준 · 📅 버튼은 <b className="text-floodlight/90 font-semibold">내 캘린더 앱</b>에 일정과 30분 전 알림을 저장해요
          </p>
          {upcoming.length === 0 ? (
            <p className="text-sm text-floodlight/60 py-6">예정된 경기 정보를 불러오지 못했습니다.</p>
          ) : (
            <ul className="divide-y divide-turf-line/40">
              {upcoming.map(({ player, teamNameKo, next }) => (
                <li key={player.id} className="flex items-center gap-3 py-3">
                  <Link href={`/players/${player.id}`} className="shrink-0">
                    <PlayerAvatar src={photo(player.id)} alt={player.name} className="w-11 h-11 rounded-full ring-2 ring-score-amber/60" />
                  </Link>
                  <Link href={matchLinkHref(next!.slugSource)} className="flex-1 min-w-0 group">
                    <p className="text-sm text-floodlight group-hover:text-score-amber transition-colors">
                      <span className="font-semibold">{player.name}</span>
                      <span className="text-floodlight/70"> · {teamNameKo}</span>
                    </p>
                    <p className="text-xs sm:text-sm text-floodlight/75 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <Logo src={next!.isHome ? next!.awayLogo : next!.homeLogo} alt="" className="w-4 h-4 shrink-0" />
                      <span>
                        vs {koTeam(next!.opponentName)} ({next!.isHome ? "홈" : "원정"}) · {koLeague(next!.leagueName)}
                      </span>
                    </p>
                    <p className="text-xs sm:text-sm text-score-amber font-data mt-0.5">{formatKickoffKst(next!.date)}</p>
                  </Link>
                  <AddToCalendar
                    title={`${player.name} · ${koTeam(next!.homeName)} vs ${koTeam(next!.awayName)}`}
                    startIso={next!.date}
                    id={`${player.id}-${next!.fixtureId}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 최근 7일 활약 */}
        <section className={CARD}>
 <h2 className="text-base font-semibold font-display text-floodlight">최근 7일 활약</h2>
          <p className="text-xs sm:text-sm text-floodlight/70 mt-1 mb-3">경기별 출전 시간 · 평점 · 공격포인트</p>
          {performances.length === 0 ? (
            <p className="text-sm text-floodlight/60 py-6">최근 7일 동안 치른 공식 경기가 없습니다. (A매치 휴식기일 수 있어요)</p>
          ) : (
            <ul className="space-y-2">
              {performances.map(({ w, m }) => (
                <li key={`${w.player.id}-${m.fixtureId}`}>
                  <Link
                    href={matchLinkHref(m.slugSource)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-pitch-night/50 border border-turf-line/50 hover:border-score-amber/60 transition-colors group"
                  >
                    <PlayerAvatar src={photo(w.player.id)} alt={w.player.name} className="w-11 h-11 rounded-full ring-2 ring-score-amber/60 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-floodlight group-hover:text-score-amber transition-colors">
                        {w.player.name}
                        {m.goals > 0 && <span className="ml-1.5 text-xs text-emerald-300">⚽×{m.goals}</span>}
                        {m.assists > 0 && <span className="ml-1.5 text-xs text-sky-300">🅰️×{m.assists}</span>}
                        {m.red > 0 && <span className="ml-1.5 text-xs">🟥</span>}
                      </p>
                      <p className="text-xs sm:text-sm text-floodlight/75 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {m.result && (
                          <span className={`px-1.5 rounded text-[11px] font-bold ${RESULT_STYLE[m.result]}`}>{RESULT_LABEL[m.result]}</span>
                        )}
                        <span>
                          {koTeam(m.homeName)} {m.homeScore}:{m.awayScore} {koTeam(m.awayName)}
                        </span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {m.played ? (
                        <>
                          <p className={`font-data text-xl font-bold leading-none ${ratingColor(m.rating)}`}>
                            {m.rating !== null ? m.rating.toFixed(1) : "-"}
                          </p>
                          <p className="text-xs text-floodlight/65 mt-1">
                            {m.minutes}분{m.substitute ? " (교체)" : ""}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-floodlight/65">{m.statsAvailable ? "미출전" : "기록 미제공"}</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {noMatch.length > 0 && performances.length > 0 && (
            <p className="text-xs text-floodlight/60 mt-3">최근 7일 경기 없음: {noMatch.map((w) => w.player.name).join(", ")}</p>
          )}
        </section>
      </div>
    </div>
  )
}
