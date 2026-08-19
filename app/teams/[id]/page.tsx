import Link from "next/link"
import type { Metadata } from "next"
import { getSeasonYear } from "@/lib/season"
import {
  MOCK_TEAM_INFO,
  MOCK_TEAM_SQUAD,
  MOCK_TEAM_FIXTURES,
  MOCK_INJURIES,
  MOCK_COACH,
} from "@/lib/mockData"

type TeamInfo = {
  team: { id: number; name: string; country: string; founded: number; logo: string }
  venue: { name: string; city: string; capacity: number }
}

type SquadPlayer = {
  player: { id: number; name: string; age: number; photo: string }
  position: string
}

type TeamFixture = {
  fixture: { id: number; date: string; status: { long: string; short: string } }
  teams: {
    home: { name: string; logo: string }
    away: { name: string; logo: string }
  }
  goals: { home: number | null; away: number | null }
}

type Injury = {
  player: { id: number; name: string; photo: string }
  type: string
  reason: string
}

type Coach = {
  id: number
  name: string
  age: number | null
  nationality: string
  photo: string
  career: { team: { id: number; name: string; logo: string }; start: string; end: string | null }[]
}

async function getTeamInfo(teamId: string): Promise<TeamInfo | null> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TEAM_INFO

  const res = await fetch(`https://v3.football.api-sports.io/teams?id=${teamId}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
    next: { revalidate: 3600 },
  })
  const data = await res.json()
  return data.response?.[0] ?? null
}

async function getTeamSquad(teamId: string): Promise<SquadPlayer[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TEAM_SQUAD

  const res = await fetch(`https://v3.football.api-sports.io/players/squads?team=${teamId}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
    next: { revalidate: 3600 },
  })
  const data = await res.json()
  return data.response?.[0]?.players ?? []
}

async function getTeamFixtures(teamId: string, season: number): Promise<TeamFixture[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TEAM_FIXTURES

  const res = await fetch(
    `https://v3.football.api-sports.io/fixtures?team=${teamId}&season=${season}`,
    {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      next: { revalidate: 3600 },
    }
  )
  const data = await res.json()
  return data.response ?? []
}

async function getInjuries(teamId: string, season: number): Promise<Injury[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_INJURIES

  const res = await fetch(
    `https://v3.football.api-sports.io/injuries?team=${teamId}&season=${season}`,
    {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      next: { revalidate: 3600 },
    }
  )
  const data = await res.json()
  return data.response ?? []
}

async function getCoach(teamId: string, expectedTeamId: number): Promise<Coach | null> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_COACH

  const res = await fetch(`https://v3.football.api-sports.io/coachs?team=${teamId}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
    next: { revalidate: 3600 },
  })
  const data = await res.json()
  const coaches: Coach[] = data.response ?? []

  // API가 그 팀 역대 감독 여러 명을 배열로 줄 수 있어서, 무조건 첫 번째를 쓰지 않고
  // "지금 이 팀 소속(퇴임일 없음)"이 확실한 사람만 배열 전체에서 찾음
  return (
    coaches.find((c) => c.career?.some((car) => car.team.id === expectedTeamId && car.end === null)) ?? null
  )
}




const POSITION_LABEL: Record<string, string> = {
  Goalkeeper: "골키퍼",
  Defender: "수비수",
  Midfielder: "미드필더",
  Attacker: "공격수",
}
const POSITION_ORDER = ["Goalkeeper", "Defender", "Midfielder", "Attacker"]

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const info = await getTeamInfo(id)

  if (!info) {
    return { title: "팀 정보를 찾을 수 없습니다" }
  }

  return {
    title: `${info.team.name} 선수단 및 일정`,
    description: `${info.team.name}(${info.team.country})의 최근 경기, 다음 경기 일정, 선수단 명단을 확인하세요.`,
  }
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const info = await getTeamInfo(id)

  if (!info) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
        <p className="text-floodlight/40">팀 정보를 찾을 수 없습니다.</p>
      </main>
    )
  }

  const season = getSeasonYear(info.team.country)
  const [squad, fixtures, injuriesRaw, coach] = await Promise.all([
    getTeamSquad(id),
    getTeamFixtures(id, season),
    getInjuries(id, season),
    getCoach(id, info.team.id),
  ])

  // API가 같은 선수의 부상 기록을 중복으로 줄 때가 있어서, 선수 ID 기준으로 중복 제거
  const seenInjuryPlayer = new Set<number>()
  const injuries = injuriesRaw.filter((inj) => {
    if (!inj?.player?.id || seenInjuryPlayer.has(inj.player.id)) return false
    seenInjuryPlayer.add(inj.player.id)
    return true
  })


  // API가 가끔 선수 정보가 비어있는 항목을 섞어서 줄 때가 있어서, 그런 항목은 미리 걸러냄
  const validSquad = squad.filter((p) => p?.player?.id != null)

  const squadByPosition = POSITION_ORDER.map((pos) => ({
    position: pos,
    players: validSquad.filter((p) => p.position === pos),
  })).filter((g) => g.players.length > 0)

  const now = Date.now()
  const past = fixtures
    .filter((f) => new Date(f.fixture.date).getTime() <= now)
    .sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime())
    .slice(0, 5)
  const upcoming = fixtures
    .filter((f) => new Date(f.fixture.date).getTime() > now)
    .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())
    .slice(0, 5)

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        {/* 팀 헤더 */}
        <div className="flex items-center gap-4 bg-turf/40 border-l-2 border-score-amber p-6">
          <img src={info.team.logo} alt="" className="w-16 h-16" />
          <div>
            <h1 className="font-display uppercase text-xl">{info.team.name}</h1>
            <p className="text-xs text-floodlight/40 mt-1">
              {info.team.country} · 창단 {info.team.founded}년
            </p>
            {info.venue && (
              <p className="text-xs text-floodlight/40">
                홈구장: {info.venue.name} ({info.venue.city})
              </p>
            )}
          </div>
        </div>

        {/* 감독 */}
        {coach && (
          <div className="bg-turf/40 border-l-2 border-score-amber p-5 mt-6">
            <h2 className="text-sm font-display uppercase tracking-wide text-floodlight/60 mb-3">감독</h2>
            <div className="flex items-center gap-4">
              <img
                src={coach.photo}
                alt=""
                className="w-14 h-14 rounded-full bg-turf-line object-cover"
              />
              <div>
              <p className="text-sm font-medium">{coach.name}</p>
                {(coach.nationality || coach.age) && (
                  <p className="text-xs text-floodlight/40 mt-0.5">
                    {coach.nationality}
                    {coach.age && ` · ${coach.age}세`}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        {/* 감독 */}
        {coach && (
          <div className="bg-turf/40 border-l-2 border-score-amber p-5 mt-6">
            <h2 className="text-sm font-display uppercase tracking-wide text-floodlight/60 mb-3">감독</h2>
            <div className="flex items-center gap-4">
              <img
                src={coach.photo}
                alt=""
                className="w-14 h-14 rounded-full bg-turf-line object-cover"
              />
              <div>
                <p className="text-sm font-medium">{coach.name}</p>
                {(coach.nationality || coach.age) && (
                  <p className="text-xs text-floodlight/40 mt-0.5">
                    {coach.nationality}
                    {coach.age && ` · ${coach.age}세`}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}




        {/* 최근 경기 */}
        {past.length > 0 && (
          <div className="bg-turf/40 border-l-2 border-score-amber mt-6">
            <div className="px-4 py-3 border-b border-turf-line/60">
              <h2 className="text-sm font-display uppercase tracking-wide text-floodlight/60">
                최근 경기
              </h2>
            </div>
            <div>
              {past.map((f) => (
                <Link
                  key={f.fixture.id}
                  href={`/matches/${f.fixture.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-turf-line/40 transition-colors border-b border-turf-line/40 last:border-b-0"
                >
                  <span className="text-xs text-floodlight/40 w-14 shrink-0 font-data">
                    {new Date(f.fixture.date).toLocaleDateString("ko-KR", {
                      month: "numeric",
                      day: "numeric",
                    })}
                  </span>
                  <div className="flex-1 flex items-center justify-center gap-2 text-sm">
                    <img src={f.teams.home.logo} alt="" className="w-5 h-5" />
                    <span className="text-floodlight/80">{f.teams.home.name}</span>
                    <span className="text-score-amber font-data font-semibold mx-1">
                      {f.goals.home ?? "-"} : {f.goals.away ?? "-"}
                    </span>
                    <span className="text-floodlight/80">{f.teams.away.name}</span>
                    <img src={f.teams.away.logo} alt="" className="w-5 h-5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 다음 경기 */}
        {upcoming.length > 0 && (
          <div className="bg-turf/40 border-l-2 border-score-amber mt-6">
            <div className="px-4 py-3 border-b border-turf-line/60">
              <h2 className="text-sm font-display uppercase tracking-wide text-floodlight/60">
                다음 경기
              </h2>
            </div>
            <div>
              {upcoming.map((f) => (
                <Link
                  key={f.fixture.id}
                  href={`/matches/${f.fixture.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-turf-line/40 transition-colors border-b border-turf-line/40 last:border-b-0"
                >
                  <span className="text-xs text-floodlight/40 w-14 shrink-0 font-data">
                    {new Date(f.fixture.date).toLocaleDateString("ko-KR", {
                      month: "numeric",
                      day: "numeric",
                    })}
                  </span>
                  <div className="flex-1 flex items-center justify-center gap-2 text-sm">
                    <img src={f.teams.home.logo} alt="" className="w-5 h-5" />
                    <span className="text-floodlight/80">{f.teams.home.name}</span>
                    <span className="text-floodlight/30 mx-1 font-data">vs</span>
                    <span className="text-floodlight/80">{f.teams.away.name}</span>
                    <img src={f.teams.away.logo} alt="" className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-floodlight/40 font-data shrink-0">
                    {new Date(f.fixture.date).toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 부상자/결장 명단 */}
        {injuries.length > 0 && (
          <div className="bg-turf/40 border-l-2 border-live-red p-4 mt-6">
            <h2 className="text-sm font-display uppercase tracking-wide text-floodlight/60 mb-3">
              부상/결장 명단
            </h2>
            <div className="space-y-3">
              {injuries.map((inj, i) => (
                <Link
                  key={i}
                  href={`/players/${inj.player.id}`}
                  className="flex items-center gap-3 text-xs hover:opacity-80"
                >
                  <img
                    src={inj.player.photo}
                    alt=""
                    className="w-8 h-8 rounded-full bg-turf-line object-cover"
                  />
                  <span className="flex-1 truncate">{inj.player.name}</span>
                  <span className="text-live-red/80">{inj.reason || inj.type}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 스쿼드 */}
        <div className="mt-6 space-y-4">
          {squadByPosition.map((group) => (
            <div key={group.position} className="bg-turf/40 border-l-2 border-score-amber p-4">
              <h2 className="text-sm font-display uppercase tracking-wide text-floodlight/60 mb-3">
                {POSITION_LABEL[group.position] ?? group.position}
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {group.players.map((p) => (
                  <Link
                    key={p.player.id}
                    href={`/players/${p.player.id}`}
                    className="flex flex-col items-center text-center hover:opacity-80"
                  >
                    <img
                      src={p.player.photo}
                      alt=""
                      className="w-12 h-12 rounded-full bg-turf-line object-cover mb-1"
                    />
                    <span className="text-xs text-floodlight/90 truncate w-full">{p.player.name}</span>
                    <span className="text-[10px] text-floodlight/30">{p.player.age}세</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}