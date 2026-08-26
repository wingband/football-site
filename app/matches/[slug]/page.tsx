import { Suspense } from "react"
import Link from "next/link"
import { permanentRedirect } from "next/navigation"
import { apiFetch } from "@/lib/matchApi"
import PlayerAvatar from "@/components/PlayerAvatar"
import FotmobLineup from "@/components/FotmobLineup"
import Section from "@/components/Section"
import FollowButton from "@/components/FollowButton"
import MatchTabs from "@/components/MatchTabs"
import KeyStatsPanel from "@/components/KeyStatsPanel"
import MatchStatsPanel from "@/components/MatchStatsPanel"
import MatchEventsTimeline from "@/components/MatchEventsTimeline"
import MatchReviewCard from "@/components/MatchReviewCard"
import AdSlot from "@/components/AdSlot"
import RelatedMatches from "@/components/RelatedMatches"
import StorySection from "./_components/StorySection"
import NewsSection from "./_components/NewsSection"
import RecentFormSection from "./_components/RecentFormSection"
import StandingsSection from "./_components/StandingsSection"
import H2HSection from "./_components/H2HSection"
import SidebarDeferredSection from "./_components/SidebarDeferredSection"
import { getSeasonYear } from "@/lib/season"
import { buildMatchSlug, matchHref, parseFixtureId } from "@/lib/slug"
import { MOCK_MATCH_DETAIL } from "@/lib/mockData"
import { getArticleByMatchId } from "@/lib/articles"
import type { Metadata } from "next"


type FixtureDetail = {
  fixture: {
    id: number
    date: string
    status: { long: string; short?: string; elapsed?: number | null }
    venue: { id?: number | null; name: string; city: string }
    referee: string | null
  }
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null }
    away: { id: number; name: string; logo: string; winner: boolean | null }
  }
  goals: {
    home: number | null
    away: number | null
  }
  score: {
    halftime: { home: number | null; away: number | null }
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
    round?: string
  }
}

type Statistic = {
  team: { name: string }
  statistics: { type: string; value: number | string | null }[]
}

type MatchEvent = {
  time: { elapsed: number; extra: number | null }
  team: { name: string; logo: string }
  player: { name: string }
  assist: { name: string | null }
  type: string
  detail: string
}

type PlayerStat = {
  team: { name: string; logo: string }
  players: {
    player: { id?: number; name: string; photo: string }
    statistics: {
      games: { rating: string | null; position: string }
      goals: { total: number | null; assists: number | null }
    }[]
  }[]
}

type Lineup = {
  team: { name: string; logo: string }
  formation: string
  startXI: { player: { id: number; name: string; number: number; pos: string; grid: string | null } }[]
  substitutes?: { player: { id: number; name: string; number: number; pos: string; grid: string | null } }[]
  coach: { name: string; photo?: string }
}

const LIVE_CODES = ["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]
const FINISHED_CODES = ["FT", "AET", "PEN"]

// 경기 상세 페이지 전용 fixture fetch — mock 모드와 실제 모드를 분리
async function fetchFixture(fixtureId: number): Promise<FixtureDetail[]> {
  if (process.env.USE_MOCK_DATA === "true") {
    return MOCK_MATCH_DETAIL.fixture as FixtureDetail[]
  }
  return apiFetch(`/fixtures?id=${fixtureId}`) as Promise<FixtureDetail[]>
}

function getTopRatedPlayers(playerStats: PlayerStat[], count: number) {
  const all = playerStats.flatMap((team) =>
    team.players.map((p) => ({
      name: p.player.name,
      photo: p.player.photo,
      rating: p.statistics[0]?.games?.rating,
      position: p.statistics[0]?.games?.position,
      goals: p.statistics[0]?.goals?.total ?? 0,
      assists: p.statistics[0]?.goals?.assists ?? 0,
    }))
  )
  return all
    .filter((p) => p.rating)
    .sort((a, b) => Number(b.rating) - Number(a.rating))
    .slice(0, count)
}


export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const fixtureId = parseFixtureId(slug)

  if (fixtureId === null) {
    return { title: "경기 정보를 찾을 수 없습니다" }
  }

  const matchArr = await fetchFixture(fixtureId)
  const match = matchArr?.[0] ?? null

  if (!match) {
    return { title: "경기 정보를 찾을 수 없습니다" }
  }

  const scoreText =
    match.goals.home !== null && match.goals.away !== null
      ? `${match.goals.home}:${match.goals.away}`
      : "경기 정보"

  // AI 리뷰가 이미 생성돼 있으면 득점/어시스트 선수 이름을 메타데이터에도 반영 (SEO)
  const article = process.env.USE_MOCK_DATA === "true" ? null : await getArticleByMatchId(fixtureId)
  const keyPlayers = article?.playerTags.slice(0, 3) ?? []
  const keyPlayersText = keyPlayers.length ? ` - ${keyPlayers.join(", ")}` : ""

  const title = `${match.teams.home.name} vs ${match.teams.away.name} (${scoreText})${keyPlayersText}`
  const description = keyPlayers.length
    ? `${match.league.name} - ${match.teams.home.name}와 ${match.teams.away.name}의 경기. ${keyPlayers.join(", ")}의 활약을 포함한 스코어, 라인업, 통계, 분석을 확인하세요.`
    : `${match.league.name} - ${match.teams.home.name}와 ${match.teams.away.name}의 경기 스코어, 라인업, 통계, 분석을 확인하세요.`

  return {
    title,
    description,
    alternates: { canonical: matchHref(match) },
    openGraph: { title, description },
  }
}


export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const fromReview = sp.from === "review"
  const fixtureId = parseFixtureId(slug)

  const notFoundView = (
    <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
      <p className="text-floodlight/50">경기 정보를 찾을 수 없습니다.</p>
    </main>
  )

  if (fixtureId === null) {
    return notFoundView
  }

  const matchArr = await fetchFixture(fixtureId)
  const match = matchArr?.[0] ?? null

  if (!match) {
    return notFoundView
  }

  // slug 정규화 — 리다이렉트는 Suspense 경계 앞에서 처리해야 올바른 HTTP 상태코드가 나온다
  const canonicalSlug = buildMatchSlug(match)
  if (slug !== canonicalSlug) {
    permanentRedirect(`/matches/${canonicalSlug}${fromReview ? "?from=review" : ""}`)
  }

  const season = getSeasonYear(match.league.country)

  const isFinished = FINISHED_CODES.includes(match.fixture.status.short ?? "")
  const isLive = LIVE_CODES.includes(match.fixture.status.short ?? "")

  // 종료/진행/예정에 따라 캐시 전략 분기
  const matchDataRevalidate = isFinished ? 86400 : isLive ? 60 : 3600

  // ── 빠른 경로: 즉시 렌더링에 필요한 4개 병렬 호출 ──────────────────
  const [stats, events, playerStats, lineups] = await Promise.all([
    apiFetch(`/fixtures/statistics?fixture=${fixtureId}`, matchDataRevalidate) as Promise<Statistic[]>,
    apiFetch(`/fixtures/events?fixture=${fixtureId}`, matchDataRevalidate) as Promise<MatchEvent[]>,
    apiFetch(`/fixtures/players?fixture=${fixtureId}`, matchDataRevalidate) as Promise<PlayerStat[]>,
    apiFetch(`/fixtures/lineups?fixture=${fixtureId}`, matchDataRevalidate) as Promise<Lineup[]>,
  ])

  // statsSummary는 fast path의 stats에서 즉시 계산해 StorySection에 prop으로 전달
  const statsSummary =
    stats.length === 2
      ? stats[0].statistics
          .map((s, i) => `${s.type}: ${s.value ?? 0} vs ${stats[1].statistics[i]?.value ?? 0}`)
          .join(", ")
      : "통계 데이터 없음"

  const topPlayers = getTopRatedPlayers(playerStats, 3)

  const getStatValue = (teamStats: Statistic["statistics"], key: string) => {
    const found = teamStats.find((s) => s.type.toLowerCase() === key.toLowerCase())
    return found?.value ?? null
  }
  const homeStats = stats[0]?.statistics ?? []
  const awayStats = stats[1]?.statistics ?? []
  const homeXg = getStatValue(homeStats, "expected_goals")
  const awayXg = getStatValue(awayStats, "expected_goals")
  const hasXg = homeXg !== null || awayXg !== null

  const dateText = new Date(match.fixture.date).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  })

  // ── 스켈레톤 fallback UI ────────────────────────────────────────────

  const storySkeleton = (
    <div className="mt-5 bg-score-amber/5 border-l-2 border-score-amber animate-pulse">
      <div className="px-5 py-5 space-y-2.5">
        <div className="h-3.5 bg-floodlight/10 rounded w-3/4" />
        <div className="h-3 bg-floodlight/10 rounded w-full" />
        <div className="h-3 bg-floodlight/10 rounded w-5/6" />
        <div className="h-3 bg-floodlight/10 rounded w-4/5" />
      </div>
    </div>
  )

  const sectionSkeleton = (title: string) => (
    <div className="mt-5 animate-pulse">
      <div className="h-4 bg-floodlight/10 rounded w-24 mb-3" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-3 bg-floodlight/10 rounded" style={{ width: `${70 + i * 8}%` }} />
        ))}
      </div>
    </div>
  )

  const standingsSkeleton = (
    <div className="mt-5 animate-pulse space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-2">
          <div className="h-4 bg-floodlight/10 rounded w-6" />
          <div className="h-4 bg-floodlight/10 rounded flex-1" />
          <div className="h-4 bg-floodlight/10 rounded w-8" />
        </div>
      ))}
    </div>
  )

  const sidebarSkeleton = (
    <div className="space-y-4 animate-pulse">
      <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4 h-32" />
      <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4 h-48" />
    </div>
  )

  // ── 탭별 콘텐츠 ──────────────────────────────────────────────────────

  const factsContent = (
    <>
      {/* AI 리뷰: 종료 경기만 비동기 생성, 예정/진행 중은 즉시 표시 */}
      {isFinished ? (
        <Suspense fallback={storySkeleton}>
          <StorySection
            matchId={fixtureId}
            homeTeam={match.teams.home.name}
            awayTeam={match.teams.away.name}
            homeScore={match.goals.home}
            awayScore={match.goals.away}
            leagueName={match.league.name}
            statsSummary={statsSummary}
            homeLogo={match.teams.home.logo}
            awayLogo={match.teams.away.logo}
          />
        </Suspense>
      ) : (
        <MatchReviewCard
          headline={`${match.teams.home.name} vs ${match.teams.away.name}`}
          summary="경기 예정 — 리뷰는 경기 종료 후 제공됩니다."
          homeLogo={match.teams.home.logo}
          awayLogo={match.teams.away.logo}
          storySlug={null}
        />
      )}

      {stats.length === 2 && (
        <Section title="주요 통계">
          <KeyStatsPanel stats={stats} />
        </Section>
      )}

      {hasXg && (
        <Section title="기대 골 (xG)">
          <div className="flex justify-between items-center">
            <span className="font-data font-bold text-xl text-score-amber">{homeXg ?? "–"}</span>
            <span className="text-xs text-floodlight/30">xG</span>
            <span className="font-data font-bold text-xl text-floodlight/80">{awayXg ?? "–"}</span>
          </div>
        </Section>
      )}

      <Section title="이벤트">
        <MatchEventsTimeline
          events={events}
          homeTeamName={match.teams.home.name}
          homeGoalsFinal={match.goals.home}
          awayGoalsFinal={match.goals.away}
          homeGoalsHT={match.score?.halftime?.home ?? null}
          awayGoalsHT={match.score?.halftime?.away ?? null}
          isFinished={isFinished}
        />
      </Section>

      {/* 팀 최근 폼 + 다음 경기 — 캐시된 API 호출이지만 첫 로드 병목 해소 */}
      <Suspense fallback={sectionSkeleton("팀 기록")}>
        <RecentFormSection
          homeTeamId={match.teams.home.id}
          awayTeamId={match.teams.away.id}
          currentFixtureId={match.fixture.id}
        />
      </Suspense>

      {/* 뉴스 — 외부 API, 느릴 수 있으므로 분리 */}
      <Suspense fallback={sectionSkeleton("뉴스")}>
        <NewsSection
          homeTeam={match.teams.home.name}
          awayTeam={match.teams.away.name}
        />
      </Suspense>

      {lineups.length === 2 && (
        <Section title="라인업">
          <FotmobLineup lineups={lineups} playerStats={playerStats} events={events} />
        </Section>
      )}

      {topPlayers.length > 0 && (
        <Section title="이 경기 최고 평점">
          <div className="grid grid-cols-3 gap-4">
            {topPlayers.map((p) => (
              <div key={p.name} className="flex flex-col items-center text-center">
                <PlayerAvatar
                  src={p.photo}
                  alt={p.name}
                  className="w-16 h-16 rounded-full object-cover text-lg"
                />
                <span className="text-sm font-medium mt-1">{p.name}</span>
                <span className="text-xs text-floodlight/40">{p.position}</span>
                <span className="mt-1 font-display text-score-amber font-bold">{p.rating}</span>
                {(p.goals > 0 || p.assists > 0) && (
                  <span className="text-xs text-floodlight/40">
                    {p.goals > 0 && `⚽${p.goals}`} {p.assists > 0 && `🅰️${p.assists}`}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  )

  const tickerContent = (
    <Section title="경기 타임라인">
      <MatchEventsTimeline
        events={events}
        homeTeamName={match.teams.home.name}
        homeGoalsFinal={match.goals.home}
        awayGoalsFinal={match.goals.away}
        homeGoalsHT={match.score?.halftime?.home ?? null}
        awayGoalsHT={match.score?.halftime?.away ?? null}
        isFinished={isFinished}
      />
    </Section>
  )

  const lineupContent =
    lineups.length === 2 ? (
      <Section title="라인업">
        <FotmobLineup lineups={lineups} playerStats={playerStats} events={events} />
      </Section>
    ) : (
      <p className="text-floodlight/40 text-sm py-6 text-center">라인업 정보가 없습니다.</p>
    )

  // 순위 탭 — 사용자가 탭을 클릭하기 전까지 보이지 않으므로 지연 로딩 적합
  const standingsContent = (
    <Suspense fallback={standingsSkeleton}>
      <StandingsSection
        leagueId={match.league.id}
        season={season}
        homeTeamId={match.teams.home.id}
        awayTeamId={match.teams.away.id}
      />
    </Suspense>
  )

  const statsContent =
    stats.length === 2 ? (
      <>
        {hasXg && (
          <div className="bg-turf/40 border border-turf-line/30 p-4 mb-4 space-y-3">
            <p className="text-xs text-floodlight/40 uppercase tracking-wide font-display">기대 골 (xG)</p>
            <div className="flex justify-between items-center">
              <span className="font-data font-bold text-2xl text-score-amber">{homeXg ?? "–"}</span>
              <div className="text-center">
                <div className="flex h-1.5 w-32 rounded-full overflow-hidden bg-turf-line/30 mx-auto">
                  {homeXg && awayXg && (
                    <>
                      <div className="bg-score-amber" style={{ width: `${(Number(homeXg) / (Number(homeXg) + Number(awayXg))) * 100}%` }} />
                      <div className="bg-floodlight/40" style={{ width: `${(Number(awayXg) / (Number(homeXg) + Number(awayXg))) * 100}%` }} />
                    </>
                  )}
                </div>
                <p className="text-[10px] text-floodlight/30 mt-1">Expected Goals</p>
              </div>
              <span className="font-data font-bold text-2xl text-floodlight/80">{awayXg ?? "–"}</span>
            </div>
          </div>
        )}
        <Section title="통계">
          <MatchStatsPanel stats={stats} />
        </Section>
      </>
    ) : (
      <div className="py-8 text-center space-y-2">
        <p className="text-floodlight/40 text-sm">통계 정보가 없습니다.</p>
        {[292, 98, 253].includes(match.league.id) && (
          <p className="text-floodlight/25 text-xs">
            {match.league.name}은 API-Football 통계 미지원 리그입니다.
          </p>
        )}
      </div>
    )

  // 역대전적 탭 — 사용자가 탭을 클릭하기 전까지 보이지 않으므로 지연 로딩 적합
  const h2hContent = (
    <Suspense fallback={standingsSkeleton}>
      <H2HSection
        homeId={match.teams.home.id}
        awayId={match.teams.away.id}
        currentFixtureId={match.fixture.id}
        homeTeamName={match.teams.home.name}
        awayTeamName={match.teams.away.name}
        homeTeamLogo={match.teams.home.logo}
        awayTeamLogo={match.teams.away.logo}
      />
    </Suspense>
  )

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-5xl mx-auto pb-16 lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:items-start lg:px-4">
      <div className="max-w-2xl mx-auto lg:mx-0 lg:max-w-none">
        {/* 상단 바 */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-turf-line/60">
          <Link href={fromReview ? "/stories" : "/matches"} className="flex items-center gap-1.5 text-floodlight/70 hover:text-floodlight shrink-0">
            <span className="text-lg leading-none">‹</span>
            <span className="text-sm">{fromReview ? "리뷰" : "경기"}</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-floodlight/80 min-w-0">
            <img src={match.league.logo} alt="" className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {match.league.name}
              {match.league.round ? ` ${match.league.round}` : ""}
            </span>
          </div>
          <FollowButton />
        </div>

        {/* 경기 메타 정보 */}
        <div className="flex items-center justify-center gap-4 flex-wrap text-xs text-floodlight/40 px-4 py-3 border-b border-turf-line/40">
          <span className="flex items-center gap-1.5">📅 {dateText}</span>
          {match.fixture.venue?.name && (
            <span className="flex items-center gap-1.5">🏟️ {match.fixture.venue.name}</span>
          )}
          {match.fixture.referee && (
            <span className="flex items-center gap-1.5">🎙️ {match.fixture.referee}</span>
          )}
        </div>

        {/* ── LCP 요소: 스코어보드 — Suspense 경계 밖에 두어 즉시 렌더링 ── */}
        <div className="relative overflow-hidden px-6 pt-8 pb-6">
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(120% 90% at 50% -10%, rgba(245,185,66,0.14), transparent 60%), radial-gradient(80% 60% at 50% 0%, rgba(36,73,46,0.5), transparent 70%)",
            }}
          />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              <span className="font-display uppercase text-sm tracking-wide text-right leading-tight truncate">
                {match.teams.home.name}
              </span>
              <img src={match.teams.home.logo} alt="" className="w-9 h-9 shrink-0" />
            </div>

            <div className="flex flex-col items-center px-2 shrink-0">
              {isLive && (
                <span className="flex items-center gap-1.5 mb-1 text-live-red text-[11px] font-display uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-live-red animate-pulse" />
                  {match.fixture.status.elapsed}&apos; LIVE
                </span>
              )}
              <div className="font-display text-4xl text-score-amber tabular-nums leading-none [text-shadow:0_0_24px_rgba(245,185,66,0.35)]">
                {match.goals.home ?? "-"}
                <span className="text-floodlight/30 mx-1.5">-</span>
                {match.goals.away ?? "-"}
              </div>
              <span className="text-[11px] text-floodlight/40 mt-1.5">{match.fixture.status.long}</span>
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-0">
              <img src={match.teams.away.logo} alt="" className="w-9 h-9 shrink-0" />
              <span className="font-display uppercase text-sm tracking-wide text-left leading-tight truncate">
                {match.teams.away.name}
              </span>
            </div>
          </div>
        </div>

        <div className="px-4">
          <AdSlot label="경기 상세 배너 광고 (예: 728x90)" className="w-full h-16 mb-2" />
        </div>

        <MatchTabs
          facts={factsContent}
          ticker={tickerContent}
          lineup={lineupContent}
          standings={standingsContent}
          stats={statsContent}
          h2h={h2hContent}
        />
      </div>

      {/* 우측 사이드바 — venue/insights/predictions 등 비필수 데이터를 지연 로딩 */}
      <aside className="max-w-2xl mx-auto lg:mx-0 lg:max-w-none px-4 lg:px-0 mt-6 lg:mt-8">
        <Suspense fallback={sidebarSkeleton}>
          <SidebarDeferredSection
            homeTeamId={match.teams.home.id}
            awayTeamId={match.teams.away.id}
            homeTeamName={match.teams.home.name}
            awayTeamName={match.teams.away.name}
            homeTeamLogo={match.teams.home.logo}
            awayTeamLogo={match.teams.away.logo}
            leagueId={match.league.id}
            leagueName={match.league.name}
            leagueLogo={match.league.logo}
            season={season}
            round={match.league.round}
            fixtureId={fixtureId}
            venueId={match.fixture.venue?.id}
            venueName={match.fixture.venue?.name ?? ""}
            venueCity={match.fixture.venue?.city ?? ""}
            isFinished={isFinished}
          />
        </Suspense>
      </aside>
      </div>

      {/* 같은 라운드 다른 경기 — roundFixtures는 SidebarDeferredSection에서 가져오므로
          여기선 별도 async component로 fetch (Next.js fetch 중복 제거로 실제 요청 1회) */}
      {match.league.round && (
        <div className="max-w-2xl mx-auto lg:max-w-6xl px-4 pb-12">
          <Suspense fallback={null}>
            <RoundRelatedMatches
              leagueId={match.league.id}
              season={season}
              round={match.league.round}
              currentFixtureId={match.fixture.id}
              leagueName={match.league.name}
              leagueLogo={match.league.logo}
            />
          </Suspense>
        </div>
      )}
    </main>
  )
}

// 같은 라운드 경기를 스트리밍으로 채우는 인라인 async Server Component
async function RoundRelatedMatches({
  leagueId,
  season,
  round,
  currentFixtureId,
  leagueName,
  leagueLogo,
}: {
  leagueId: number
  season: number
  round: string
  currentFixtureId: number
  leagueName: string
  leagueLogo: string
}) {
  const { getRoundFixtures } = await import("@/lib/matchApi")
  const fixtures = await getRoundFixtures(leagueId, season, round)
  return (
    <RelatedMatches
      fixtures={fixtures}
      currentFixtureId={currentFixtureId}
      leagueName={leagueName}
      leagueLogo={leagueLogo}
      round={round}
    />
  )
}
