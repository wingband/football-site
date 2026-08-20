import Link from "next/link"
import { generateMatchStory } from "@/lib/generateStory"
import GoalCelebration from "@/components/GoalCelebration"
import PitchFormation from "@/components/PitchFormation"
import Section from "@/components/Section"
import FollowButton from "@/components/FollowButton"
import MatchTabs from "@/components/MatchTabs"
import StandingsTable from "@/components/StandingsTable"
import { getSeasonYear } from "@/lib/season"
import { MOCK_MATCH_DETAIL, MOCK_STANDINGS } from "@/lib/mockData"
import type { Metadata } from "next"


type FixtureDetail = {
  fixture: {
    id: number
    date: string
    status: { long: string; short?: string; elapsed?: number | null }
    venue: { name: string; city: string }
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
    player: { name: string; photo: string }
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
  coach: { name: string }
}

type H2HMatch = {
  fixture: { id: number; date: string }
  teams: {
    home: { name: string; winner: boolean | null }
    away: { name: string; winner: boolean | null }
  }
  goals: { home: number | null; away: number | null }
}

type Prediction = {
  predictions: {
    winner: { name: string | null; comment: string | null }
    percent: { home: string; draw: string; away: string }
  }
}

type StandingRow = {
  rank: number
  team: { id: number; name: string; logo: string }
  points: number
  goalsDiff: number
  group: string
  all: { played: number; win: number; draw: number; lose: number }
}

const LIVE_CODES = ["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]
const FINISHED_CODES = ["FT", "AET", "PEN"]

async function apiFetch(path: string) {
  if (process.env.USE_MOCK_DATA === "true") {
    if (path.startsWith("/fixtures?id=")) return MOCK_MATCH_DETAIL.fixture
    if (path.startsWith("/fixtures/statistics")) return MOCK_MATCH_DETAIL.statistics
    if (path.startsWith("/fixtures/events")) return MOCK_MATCH_DETAIL.events
    if (path.startsWith("/fixtures/players")) return MOCK_MATCH_DETAIL.players
    if (path.startsWith("/fixtures/lineups")) return MOCK_MATCH_DETAIL.lineups
    if (path.startsWith("/fixtures/headtohead")) return MOCK_MATCH_DETAIL.headtohead
    if (path.startsWith("/predictions")) return MOCK_MATCH_DETAIL.predictions
    return []
  }

  const res = await fetch(`https://v3.football.api-sports.io${path}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
    next: { revalidate: 3600 },
  })
  const data = await res.json()
  return data.response
}

// 순위 탭 전용 — 리그 페이지와 별도 호출 (리그 id 기준으로 시즌 순위표를 가져옴)
async function getStandings(leagueId: number, season: number): Promise<StandingRow[][]> {
  if (process.env.USE_MOCK_DATA === "true") {
    return MOCK_STANDINGS.league.standings
  }

  const res = await fetch(
    `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`,
    {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      next: { revalidate: 3600 },
    }
  )
  const data = await res.json()
  return data.response?.[0]?.league?.standings ?? []
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

function getScorers(events: MatchEvent[]) {
  return events
    .filter((ev) => ev.type === "Goal")
    .map((ev) => ({
      name: ev.player.name,
      minute: `${ev.time.elapsed}${ev.time.extra ? `+${ev.time.extra}` : ""}'`,
    }))
}


export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const matchArr: FixtureDetail[] = await apiFetch(`/fixtures?id=${id}`)
  const match = matchArr?.[0] ?? null

  if (!match) {
    return { title: "경기 정보를 찾을 수 없습니다" }
  }

  const scoreText =
    match.goals.home !== null && match.goals.away !== null
      ? `${match.goals.home}:${match.goals.away}`
      : "경기 정보"

  return {
    title: `${match.teams.home.name} vs ${match.teams.away.name} (${scoreText})`,
    description: `${match.league.name} - ${match.teams.home.name}와 ${match.teams.away.name}의 경기 스코어, 라인업, 통계, AI 분석을 확인하세요.`,
  }
}


export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const matchArr: FixtureDetail[] = await apiFetch(`/fixtures?id=${id}`)
  const match = matchArr?.[0] ?? null

  if (!match) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
        <p className="text-floodlight/50">경기 정보를 찾을 수 없습니다.</p>
      </main>
    )
  }

  const season = getSeasonYear(match.league.country)

  const [stats, events, playerStats, lineups, h2h, predictions, standings] = await Promise.all([
    apiFetch(`/fixtures/statistics?fixture=${id}`) as Promise<Statistic[]>,
    apiFetch(`/fixtures/events?fixture=${id}`) as Promise<MatchEvent[]>,
    apiFetch(`/fixtures/players?fixture=${id}`) as Promise<PlayerStat[]>,
    apiFetch(`/fixtures/lineups?fixture=${id}`) as Promise<Lineup[]>,
    apiFetch(`/fixtures/headtohead?h2h=${match.teams.home.id}-${match.teams.away.id}&last=5`) as Promise<H2HMatch[]>,
    apiFetch(`/predictions?fixture=${id}`) as Promise<Prediction[]>,
    getStandings(match.league.id, season),
  ])

  const statsSummary = stats.length === 2
    ? stats[0].statistics
        .map((s, i) => `${s.type}: ${s.value ?? 0} vs ${stats[1].statistics[i]?.value ?? 0}`)
        .join(", ")
    : "통계 데이터 없음"

  const isFinished = FINISHED_CODES.includes(match.fixture.status.short ?? "")

  // 경기가 끝난 경우에만 AI 리뷰를 생성. 시작 전/진행 중 경기에 결과 요약을 요청하면
  // AI가 없는 사실을 지어낼 수 있어서(할루시네이션) 반드시 이 조건이 필요함
  const story = isFinished
    ? await generateMatchStory({
        homeTeam: match.teams.home.name,
        awayTeam: match.teams.away.name,
        homeScore: match.goals.home,
        awayScore: match.goals.away,
        leagueName: match.league.name,
        statsSummary,
      })
    : null

  const topPlayers = getTopRatedPlayers(playerStats, 3)
  const prediction = predictions?.[0]?.predictions
  const isLive = LIVE_CODES.includes(match.fixture.status.short ?? "")
  const scorers = getScorers(events)

  const dateText = new Date(match.fixture.date).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  })

  // ── 탭별 콘텐츠 ──────────────────────────────────────────

  const factsContent = (
    <>
      {story && (
        <Section title="경기 스토리">
          <p className="text-floodlight/80 leading-relaxed text-[15px]">{story}</p>
        </Section>
      )}

      {prediction && (
        <Section title="승부 예측">
          <div className="flex h-2 overflow-hidden">
            <div className="bg-score-amber" style={{ width: `${prediction.percent.home}` }} />
            <div className="bg-floodlight/25" style={{ width: `${prediction.percent.draw}` }} />
            <div className="bg-floodlight/60" style={{ width: `${prediction.percent.away}` }} />
          </div>
          <div className="flex justify-between text-xs text-floodlight/50 mt-3 font-data">
            <span>{match.teams.home.name} {prediction.percent.home}</span>
            <span>무 {prediction.percent.draw}</span>
            <span>{match.teams.away.name} {prediction.percent.away}</span>
          </div>
          {prediction.winner.comment && (
            <p className="text-xs text-floodlight/40 mt-4">{prediction.winner.comment}</p>
          )}
        </Section>
      )}

      {topPlayers.length > 0 && (
        <Section title="이 경기 최고 평점">
          <div className="grid grid-cols-3 gap-4">
            {topPlayers.map((p) => (
              <div key={p.name} className="flex flex-col items-center text-center">
                {p.goals > 0 ? (
                  <GoalCelebration />
                ) : (
                  <img src={p.photo} alt="" className="w-16 h-16 rounded-full mb-0" />
                )}
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
      {events.length === 0 ? (
        <p className="text-floodlight/40 text-sm py-2">타임라인 정보가 없습니다.</p>
      ) : (
        <div className="space-y-4">
          {events.map((ev, idx) => (
            <div key={idx} className="flex items-center gap-3 text-sm">
              <span className="font-data text-floodlight/40 w-10 shrink-0 text-xs">
                {ev.time.elapsed}{ev.time.extra ? `+${ev.time.extra}` : ""}&apos;
              </span>
              <span>
                {ev.type === "Goal" && "⚽"}
                {ev.type === "Card" && ev.detail === "Yellow Card" && "🟨"}
                {ev.type === "Card" && ev.detail === "Red Card" && "🟥"}
                {ev.type === "subst" && "🔄"}
              </span>
              <img src={ev.team.logo} alt="" className="w-4 h-4" />
              <span className="text-floodlight/80">
                {ev.type === "subst" ? (
                  <>
                    <span className="text-live-red/80">{ev.assist.name}</span>
                    <span className="text-floodlight/30"> → </span>
                    <span className="text-score-amber">{ev.player.name}</span>
                  </>
                ) : (
                  <>
                    {ev.player.name}
                    {ev.type === "Goal" && ev.assist.name && (
                      <span className="text-floodlight/40"> (도움: {ev.assist.name})</span>
                    )}
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </Section>
  )

  const lineupContent =
    lineups.length === 2 ? (
      <Section title="라인업">
        <div className="grid grid-cols-2 gap-6">
          <PitchFormation
            teamName={lineups[0].team.name}
            teamLogo={lineups[0].team.logo}
            formation={lineups[0].formation}
            players={lineups[0].startXI}
            coach={lineups[0].coach?.name ?? "-"}
            flip={false}
          />
          <PitchFormation
            teamName={lineups[1].team.name}
            teamLogo={lineups[1].team.logo}
            formation={lineups[1].formation}
            players={lineups[1].startXI}
            coach={lineups[1].coach?.name ?? "-"}
            flip={true}
          />
        </div>
      </Section>
    ) : (
      <p className="text-floodlight/40 text-sm py-6 text-center">라인업 정보가 없습니다.</p>
    )

  const standingsContent = (
    <Section title="순위">
      <StandingsTable
        standings={standings}
        highlightTeamIds={[match.teams.home.id, match.teams.away.id]}
      />
    </Section>
  )

  const statsContent =
    stats.length === 2 ? (
      <Section title="주요 통계">
        <div className="space-y-5">
          {stats[0].statistics.map((stat, i) => {
            const homeVal = Number(stat.value) || 0
            const awayVal = Number(stats[1].statistics[i]?.value) || 0
            const total = homeVal + awayVal || 1
            const homePct = (homeVal / total) * 100

            return (
              <div key={stat.type}>
                <div className="flex justify-between text-sm mb-1.5 font-data">
                  <span className="font-medium">{stat.value ?? 0}</span>
                  <span className="text-floodlight/40 font-sans">{stat.type}</span>
                  <span className="font-medium">{stats[1].statistics[i]?.value ?? 0}</span>
                </div>
                <div className="w-full bg-floodlight/10 h-1.5 flex overflow-hidden">
                  <div
                    className="bg-score-amber h-1.5 transition-all duration-1000"
                    style={{ width: `${homePct}%` }}
                  />
                  <div
                    className="bg-floodlight/25 h-1.5 transition-all duration-1000"
                    style={{ width: `${100 - homePct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Section>
    ) : (
      <p className="text-floodlight/40 text-sm py-6 text-center">통계 정보가 없습니다.</p>
    )

  const h2hContent =
    h2h.length > 0 ? (
      <Section title="역대 상대전적">
        <div className="space-y-3">
          {h2h.map((m) => (
            <div key={m.fixture.id} className="flex items-center justify-between text-sm text-floodlight/70">
              <span className="text-xs text-floodlight/40 w-24 font-data">
                {new Date(m.fixture.date).toLocaleDateString("ko-KR")}
              </span>
              <span className="flex-1 text-center font-data">
                {m.teams.home.name} {m.goals.home} : {m.goals.away} {m.teams.away.name}
              </span>
            </div>
          ))}
        </div>
      </Section>
    ) : (
      <p className="text-floodlight/40 text-sm py-6 text-center">상대전적 정보가 없습니다.</p>
    )

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-2xl mx-auto pb-16">
        {/* 상단 바: 뒤로가기 / 리그명+라운드 / 팔로우 */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-turf-line/60">
          <Link href="/matches" className="flex items-center gap-1.5 text-floodlight/70 hover:text-floodlight shrink-0">
            <span className="text-lg leading-none">‹</span>
            <span className="text-sm">경기</span>
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

        {/* 경기 메타 정보: 날짜 / 구장 / 심판 */}
        <div className="flex items-center justify-center gap-4 flex-wrap text-xs text-floodlight/40 px-4 py-3 border-b border-turf-line/40">
          <span className="flex items-center gap-1.5">📅 {dateText}</span>
          {match.fixture.venue?.name && (
            <span className="flex items-center gap-1.5">🏟️ {match.fixture.venue.name}</span>
          )}
          {match.fixture.referee && (
            <span className="flex items-center gap-1.5">🎙️ {match.fixture.referee}</span>
          )}
        </div>

        {/* 스코어보드 */}
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

          {scorers.length > 0 && (
            <div className="flex flex-col items-center gap-0.5 mt-3 text-xs text-floodlight/50 font-data">
              {scorers.map((s, i) => (
                <span key={i}>{s.name} {s.minute}</span>
              ))}
            </div>
          )}
        </div>

        {/* 탭: 팩트 / 티커 / 라인업 / 순위 / 통계 / 역대전적 */}
        <MatchTabs
          facts={factsContent}
          ticker={tickerContent}
          lineup={lineupContent}
          standings={standingsContent}
          stats={statsContent}
          h2h={h2hContent}
        />
      </div>
    </main>
  )
}
