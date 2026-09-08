import Link from "next/link"
import { matchHref } from "@/lib/slug"
import type { Metadata } from "next"
import PlayerAvatar from "@/components/PlayerAvatar"
import StandingsWithFilter from "@/components/StandingsWithFilter"
import { TEAM_NAME_KO, NATIONAL_TEAM_COACH_OVERRIDE } from "@/lib/koreanNames"
import {
  getTeamInfo,
  getTeamSeasonFixtures,
  getTeamInjuries,
  getTeamCoach,
  getTeamCurrentLeague,
  getTeamNews,
  type TeamFixture,
} from "@/lib/teamData"
import { getLeagueStandings, getLeagueFixturesByMode, buildNextOpponentMap } from "@/lib/leagueData"
import { isTeamInScope } from "@/lib/scope"
import { SITE_URL } from "@/lib/siteConfig"
import Logo from "@/components/Logo"

const FINISHED_CODES = ["FT", "AET", "PEN"]

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const info = await getTeamInfo(id)
  if (!info) return { title: "팀 정보를 찾을 수 없습니다" }
  const teamNameKo = TEAM_NAME_KO[info.team.name] ?? info.team.name
  return {
    title: `${teamNameKo} 다음경기 일정 · 순위 · 최근 경기 결과`,
    description: `${teamNameKo}의 다음 경기 일정, 최근 경기 결과, 리그 순위, 감독, 부상 선수 명단, 이적 소식을 확인하세요.`,
  }
}

// 팀 기록: 최근 5경기 결과 배지 (FotMob 스타일)
function RecentFormBadges({ fixtures, teamId }: { fixtures: TeamFixture[]; teamId: number }) {
  const finished = fixtures
    .filter((f) => FINISHED_CODES.includes(f.fixture.status.short))
    .sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime())
    .slice(0, 5)
    .reverse()

  if (finished.length === 0) {
    return <p className="text-floodlight/40 text-xs">최근 경기 기록이 없습니다.</p>
  }

  return (
    <div className="flex gap-3">
      {finished.map((fx) => {
        const isHome = fx.teams.home.id === teamId
        const own = isHome ? fx.goals.home : fx.goals.away
        const opp = isHome ? fx.goals.away : fx.goals.home
        const opponent = isHome ? fx.teams.away : fx.teams.home
        const color =
          own === null || opp === null
            ? "bg-floodlight/15"
            : own > opp
              ? "bg-green-600 text-white"
              : own < opp
                ? "bg-red-500/80 text-white"
                : "bg-floodlight/30 text-floodlight"

        return (
          <Link key={fx.fixture.id} href={matchHref(fx)} className="flex flex-col items-center gap-2">
            <span className={`px-2.5 py-1 rounded font-data text-sm font-bold ${color}`}>
              {fx.goals.home ?? "-"} - {fx.goals.away ?? "-"}
            </span>
            <Logo src={opponent.logo} alt="" className="w-6 h-6" />
          </Link>
        )
      })}
    </div>
  )
}

export default async function TeamOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const info = await getTeamInfo(id)

  if (!info) {
    return <p className="text-floodlight/40 pt-4">팀 정보를 찾을 수 없습니다.</p>
  }

  const teamLeague = await getTeamCurrentLeague(id)

  // (2026-09-08) 스코프 밖 팀을 여기서 404 처리하던 로직을 제거함.
  // 유명하지 않은 팀(예: Willem II, 김지수의 예전 소속 Kaiserslautern 등)이
  // 정상적인 내부 링크(선수 페이지, 매치 라인업 등)를 통해 접근돼도 막혀버려서
  // 실제 사용자 탐색이 광범위하게 깨지는 문제가 있었다. 팀 페이지 자체가 이미
  // 2콜 수준으로 가벼워졌고, 봇의 대량 스캔은 middleware.ts의 분당 40회
  // 레이트리밋으로 방어하는 걸로 역할을 넘긴다.
  //
  // 다만 완전히 무방비는 아니고, 중간 지점으로 스코프 밖 팀은 아래 4개 호출의
  // 캐시를 24시간으로 늘려서 반복 조회 비용을 낮춘다 (봇이 같은 팀을 몇 번이고
  // 다시 훑어도 캐시 만료 전까진 API를 다시 안 부른다). isTeamInScope는 더 이상
  // 차단용이 아니라 이 캐시 길이를 정하는 용도로만 재사용한다
  const inScope = isTeamInScope(teamLeague?.id, info.team.name)
  const OUT_OF_SCOPE_REVALIDATE = 86400 // 24시간

  const season = teamLeague?.season ?? new Date().getFullYear()

  const [fixtures, injuries, coach, news, standingsData, leagueUpcoming] = await Promise.all([
    getTeamSeasonFixtures(id, season, inScope ? undefined : OUT_OF_SCOPE_REVALIDATE),
    getTeamInjuries(id, season, inScope ? undefined : OUT_OF_SCOPE_REVALIDATE),
    getTeamCoach(id, info.team.id),
    getTeamNews(info.team.name),
    teamLeague ? getLeagueStandings(String(teamLeague.id), season, inScope ? undefined : OUT_OF_SCOPE_REVALIDATE) : Promise.resolve(null),
    teamLeague ? getLeagueFixturesByMode(String(teamLeague.id), season, "next", 10, inScope ? undefined : OUT_OF_SCOPE_REVALIDATE) : Promise.resolve([]),
  ])

  const nextOpponent = buildNextOpponentMap(leagueUpcoming)

  const upcoming = fixtures
    .filter((f) => !FINISHED_CODES.includes(f.fixture.status.short))
    .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())
  const nextFixture = upcoming[0] ?? null

  // 부상 명단 중복 제거 (같은 선수가 여러 건으로 잡히는 경우)
  const uniqueInjuries = [...new Map(injuries.map((i) => [i.player.id, i])).values()]

  // API-Football의 국가대표팀 감독 데이터가 실제보다 뒤처지는 경우를 위한 오버라이드
  // (예: 감독 사퇴 후 후임 미확정 상태). 확정 안 된 정보는 구조화 데이터에 아예 안 넣는다
  const coachOverrideNote = NATIONAL_TEAM_COACH_OVERRIDE[info.team.name]

  const sportsTeamJsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: info.team.name,
    logo: info.team.logo,
    sport: "Soccer",
    url: `${SITE_URL}/teams/${id}`,
    ...(coach?.name && !coachOverrideNote ? { coach: { "@type": "Person", name: coach.name } } : {}),
    ...(teamLeague?.name
      ? { memberOf: { "@type": "SportsOrganization", name: teamLeague.name } }
      : {}),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsTeamJsonLd) }}
      />
        {/* 상단: 팀 기록 + 다음 경기 */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
            <p className="text-sm font-medium mb-3">팀 기록</p>
            <RecentFormBadges fixtures={fixtures} teamId={info.team.id} />
          </div>

          {nextFixture && (
            <Link
              href={matchHref(nextFixture)}
              className="bg-turf/40 border border-turf-line/40 rounded-md p-4 hover:bg-turf-line/20 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">다음 경기</p>
                {nextFixture.league?.name && (
                  <span className="text-xs text-floodlight/40">{nextFixture.league.name}</span>
                )}
              </div>
              <div className="flex items-center justify-around">
                <div className="flex flex-col items-center gap-1.5 min-w-0">
                  <Logo src={nextFixture.teams.home.logo} alt="" className="w-9 h-9" />
                  <span className="text-xs truncate">{nextFixture.teams.home.name}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-data text-score-amber">
                    {new Date(nextFixture.fixture.date).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-[11px] text-floodlight/40">
                    {new Date(nextFixture.fixture.date).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5 min-w-0">
                  <Logo src={nextFixture.teams.away.logo} alt="" className="w-9 h-9" />
                  <span className="text-xs truncate">{nextFixture.teams.away.name}</span>
                </div>
              </div>
            </Link>
          )}
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* 리그 순위표 */}
          <div>
            {standingsData && standingsData.league.standings.length > 0 ? (
              <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                  {teamLeague?.name}
                </p>
                <StandingsWithFilter
                  standings={standingsData.league.standings}
                  highlightTeamIds={[info.team.id]}
                  nextOpponent={nextOpponent}
                  showFilter={false}
                />
              </div>
            ) : (
              <p className="text-floodlight/40 text-sm">순위표 정보가 없습니다.</p>
            )}
          </div>

          {/* 우측: 감독 / 부상 / 경기장 */}
          <div className="space-y-4">
            {coachOverrideNote ? (
              <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
                <p className="text-sm font-medium mb-3">감독</p>
                <p className="text-xs text-floodlight/50 leading-relaxed">{coachOverrideNote}</p>
              </div>
            ) : (
              coach && (
                <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
                  <p className="text-sm font-medium mb-3">감독</p>
                  <div className="flex items-center gap-3">
                    <PlayerAvatar
                      src={coach.photo}
                      alt={coach.name}
                      className="w-11 h-11 rounded-full object-cover bg-turf-line text-sm shrink-0"
                    />
                    <div>
                      <p className="text-sm">{coach.name}</p>
                      <p className="text-xs text-floodlight/40">{coach.nationality}</p>
                    </div>
                  </div>
                </div>
              )
            )}

            {uniqueInjuries.length > 0 && (
              <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
                <p className="text-sm font-medium mb-3">부상/결장 명단</p>
                <div className="space-y-3">
                  {uniqueInjuries.slice(0, 8).map((inj) => (
                    <div key={inj.player.id} className="flex items-center gap-3">
                      <PlayerAvatar
                        src={inj.player.photo}
                        alt={inj.player.name}
                        className="w-8 h-8 rounded-full object-cover bg-turf-line text-xs shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm truncate">{inj.player.name}</p>
                        <p className="text-[11px] text-floodlight/40">{inj.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
              <p className="text-sm font-medium mb-3">경기장</p>
              <p className="text-sm">{info.venue?.name}</p>
              <p className="text-xs text-floodlight/40 mt-0.5">{info.venue?.city}</p>
              <div className="flex justify-between text-xs mt-3">
                <span className="text-floodlight/50">수용 능력</span>
                <span className="font-data">{info.venue?.capacity?.toLocaleString?.() ?? "-"}</span>
              </div>
              <div className="flex justify-between text-xs mt-1.5">
                <span className="text-floodlight/50">창단</span>
                <span className="font-data">{info.team.founded}년</span>
              </div>
            </div>
          </div>
        </div>

        {/* 뉴스 */}
        {news.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display uppercase tracking-wide text-sm text-floodlight/70">뉴스</h2>
              <Link href={`/teams/${id}/news`} className="text-xs text-floodlight/40 hover:text-score-amber">
                전체 보기 →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
              {news.slice(0, 4).map((a, i) => (
                <a
                  key={i}
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 items-start hover:bg-turf-line/20 transition-colors p-1 -m-1"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-floodlight/90 leading-snug line-clamp-2">{a.title}</p>
                    <p className="text-xs text-floodlight/40 mt-1">
                      {a.source_name} · {new Date(a.pubDate).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  {a.image_url && (
                    <img src={a.image_url} alt="" className="w-24 h-16 object-cover shrink-0 rounded" />
                  )}
                </a>
              ))}
            </div>
          </section>
        )}
    </>
  )
}
