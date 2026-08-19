import Link from "next/link"
import { getSeasonYear } from "@/lib/season"
import { MOCK_TEAM_INFO, MOCK_TEAM_SQUAD, MOCK_TEAM_FIXTURES } from "@/lib/mockData"
import type { Metadata } from "next"


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

async function getTeamInfo(teamId: string): Promise<TeamInfo | null> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TEAM_INFO

  const res = await fetch(`https://v3.football.api-sports.io/teams?id=${teamId}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
    cache: "no-store",
  })
  const data = await res.json()
  return data.response?.[0] ?? null
}

async function getTeamSquad(teamId: string): Promise<SquadPlayer[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TEAM_SQUAD

  const res = await fetch(`https://v3.football.api-sports.io/players/squads?team=${teamId}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
    cache: "no-store",
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
      cache: "no-store",
    }
  )
  const data = await res.json()
  return data.response ?? []
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
      <main className="min-h-screen bg-black text-white p-8">
        <p className="text-gray-500">팀 정보를 찾을 수 없습니다.</p>
      </main>
    )
  }

  const season = getSeasonYear(info.team.country)
  const [squad, fixtures] = await Promise.all([
    getTeamSquad(id),
    getTeamFixtures(id, season),
  ])

  const squadByPosition = POSITION_ORDER.map((pos) => ({
    position: pos,
    players: squad.filter((p) => p.position === pos),
  })).filter((g) => g.players.length > 0)

  const now = Date.now()
  const past = fixtures
    .filter((f) => new Date(f.fixture.date).getTime() <= now)
    .sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime())
    .slice(0, 5)
  const upcoming = fixtures
    .filter((f) => new Date(f.fixture.date).getTime() > now)
    .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(a.fixture.date).getTime())
    .slice(0, 5)

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        {/* 팀 헤더 */}
        <div className="flex items-center gap-4 bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <img src={info.team.logo} alt="" className="w-16 h-16" />
          <div>
            <h1 className="text-xl font-bold">{info.team.name}</h1>
            <p className="text-xs text-gray-500 mt-1">
              {info.team.country} · 창단 {info.team.founded}년
            </p>
            {info.venue && (
              <p className="text-xs text-gray-500">
                홈구장: {info.venue.name} ({info.venue.city})
              </p>
            )}
          </div>
        </div>

        {/* 최근/다음 경기 */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-3">최근 경기</h2>
            <div className="space-y-2">
              {past.map((f) => (
                <Link
                  key={f.fixture.id}
                  href={`/matches/${f.fixture.id}`}
                  className="flex items-center gap-2 text-xs hover:text-green-400"
                >
                  <img src={f.teams.home.logo} alt="" className="w-4 h-4" />
                  <span className="flex-1 truncate">
                    {f.teams.home.name} {f.goals.home}:{f.goals.away} {f.teams.away.name}
                  </span>
                  <img src={f.teams.away.logo} alt="" className="w-4 h-4" />
                </Link>
              ))}
              {past.length === 0 && <p className="text-xs text-gray-600">기록 없음</p>}
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-3">다음 경기</h2>
            <div className="space-y-2">
              {upcoming.map((f) => (
                <Link
                  key={f.fixture.id}
                  href={`/matches/${f.fixture.id}`}
                  className="flex items-center gap-2 text-xs hover:text-green-400"
                >
                  <img src={f.teams.home.logo} alt="" className="w-4 h-4" />
                  <span className="flex-1 truncate">
                    {f.teams.home.name} vs {f.teams.away.name}
                  </span>
                  <img src={f.teams.away.logo} alt="" className="w-4 h-4" />
                </Link>
              ))}
              {upcoming.length === 0 && <p className="text-xs text-gray-600">예정 경기 없음</p>}
            </div>
          </div>
        </div>

        {/* 스쿼드 */}
        <div className="mt-6 space-y-4">
          {squadByPosition.map((group) => (
            <div key={group.position} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <h2 className="text-sm font-semibold text-gray-400 mb-3">
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
                      className="w-12 h-12 rounded-full bg-gray-800 object-cover mb-1"
                    />
                    <span className="text-xs text-gray-200 truncate w-full">{p.player.name}</span>
                    <span className="text-[10px] text-gray-600">{p.player.age}세</span>
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