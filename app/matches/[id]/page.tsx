import { generateMatchStory } from "@/lib/generateStory"
import GoalCelebration from "@/components/GoalCelebration"
import PitchFormation from "@/components/PitchFormation"
import Section from "@/components/Section"
import { MOCK_MATCH_DETAIL } from "@/lib/mockData"
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
    name: string
    country: string
    logo: string
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
    cache: "no-store",
  })
  const data = await res.json()
  return data.response
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

  const [stats, events, playerStats, lineups, h2h, predictions] = await Promise.all([
    apiFetch(`/fixtures/statistics?fixture=${id}`) as Promise<Statistic[]>,
    apiFetch(`/fixtures/events?fixture=${id}`) as Promise<MatchEvent[]>,
    apiFetch(`/fixtures/players?fixture=${id}`) as Promise<PlayerStat[]>,
    apiFetch(`/fixtures/lineups?fixture=${id}`) as Promise<Lineup[]>,
    apiFetch(`/fixtures/headtohead?h2h=${match.teams.home.id}-${match.teams.away.id}&last=5`) as Promise<H2HMatch[]>,
    apiFetch(`/predictions?fixture=${id}`) as Promise<Prediction[]>,
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

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-2xl mx-auto pb-16">
        {/* 스코어보드 히어로 */}
        <div className="relative overflow-hidden px-6 pt-10 pb-8">
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(120% 90% at 50% -10%, rgba(245,185,66,0.14), transparent 60%), radial-gradient(80% 60% at 50% 0%, rgba(36,73,46,0.5), transparent 70%)",
            }}
          />
          <p className="text-center text-xs tracking-[0.2em] uppercase text-floodlight/40 mb-6">
            {match.league.name} · {match.league.country}
          </p>

          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
              <img src={match.teams.home.logo} alt="" className="w-16 h-16" />
              <span className="font-display uppercase text-sm tracking-wide text-center leading-tight">
                {match.teams.home.name}
              </span>
            </div>

            <div className="flex flex-col items-center px-2">
              {isLive && (
                <span className="flex items-center gap-1.5 mb-2 text-live-red text-[11px] font-display uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-live-red animate-pulse" />
                  {match.fixture.status.elapsed}&apos; LIVE
                </span>
              )}
              <div className="font-display text-5xl sm:text-6xl text-score-amber tabular-nums leading-none [text-shadow:0_0_24px_rgba(245,185,66,0.35)]">
                {match.goals.home ?? "-"}
                <span className="text-floodlight/30 mx-2">:</span>
                {match.goals.away ?? "-"}
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
              <img src={match.teams.away.logo} alt="" className="w-16 h-16" />
              <span className="font-display uppercase text-sm tracking-wide text-center leading-tight">
                {match.teams.away.name}
              </span>
            </div>
          </div>

          <p className="text-center text-xs text-floodlight/40 mt-7">
            {match.fixture.status.long} · {match.fixture.venue?.name ?? ""}
            {match.fixture.referee && ` · 주심 ${match.fixture.referee}`}
          </p>
        </div>

        <div className="px-4">
          {/* AI 스토리 */}
          {story && (
            <Section title="경기 스토리">
              <p className="text-floodlight/80 leading-relaxed text-[15px]">{story}</p>
            </Section>
          )}

          {/* AI 승부 예측 */}
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

          {/* 라인업 */}
          {lineups.length === 2 && (
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
          )}

          {/* 이벤트 타임라인 */}
          {events.length > 0 && (
            <Section title="경기 타임라인">
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
            </Section>
          )}

          {/* 최고 평점 선수 */}
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

          {/* 팀 스탯 비교 */}
          {stats.length === 2 && (
            <Section title="경기 분석">
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
          )}

          {/* 역대 상대전적 */}
          {h2h.length > 0 && (
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
          )}
        </div>
      </div>
    </main>
  )
}