import { getSeasonYear } from "@/lib/season"
import { MOCK_PLAYER } from "@/lib/mockData"
import type { Metadata } from "next"


type PlayerData = {
  player: {
    id: number
    name: string
    age: number
    nationality: string
    height: string
    weight: string
    photo: string
  }
  statistics: {
    team: { name: string; logo: string }
    league: { name: string; logo: string }
    games: { appearences: number | null; minutes: number | null; position: string; rating: string | null }
    goals: { total: number | null; assists: number | null }
    shots: { total: number | null; on: number | null }
    passes: { total: number | null; accuracy: number | null }
    dribbles: { attempts: number | null; success: number | null }
    duels: { total: number | null; won: number | null }
    cards: { yellow: number | null; red: number | null }
  }[]
}

async function getPlayer(playerId: string, season: number): Promise<PlayerData | null> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_PLAYER

  const res = await fetch(
    `https://v3.football.api-sports.io/players?id=${playerId}&season=${season}`,
    {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      cache: "no-store",
    }
  )
  const data = await res.json()

  // 디버깅용 — 터미널에서 확인
  console.log(`=== 선수 요청: id=${playerId}, season=${season} ===`)
  console.log("errors:", data.errors)
  console.log("results:", data.results)

  return data.response?.[0] ?? null
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  let data = await getPlayer(id, getSeasonYear("England"))
  if (!data) {
    data = await getPlayer(id, new Date().getFullYear())
  }

  if (!data) {
    return { title: "선수 정보를 찾을 수 없습니다" }
  }

  return {
    title: `${data.player.name} 선수 정보 및 통계`,
    description: `${data.player.name}(${data.player.nationality})의 출전 기록, 골, 도움, 평점 등 시즌 통계를 확인하세요.`,
  }
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let data = await getPlayer(id, getSeasonYear("England"))
  if (!data) {
    data = await getPlayer(id, new Date().getFullYear())
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <p className="text-gray-500">선수 정보를 찾을 수 없습니다.</p>
      </main>
    )
  }

  const { player } = data
  const stat = data.statistics.sort(
    (a, b) => (b.games.appearences ?? 0) - (a.games.appearences ?? 0)
  )[0]

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-5 bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <img
            src={player.photo}
            alt=""
            className="w-24 h-24 rounded-full bg-gray-800 object-cover border-2 border-green-600"
          />
          <div>
            <h1 className="text-xl font-bold">{player.name}</h1>
            <p className="text-xs text-gray-500 mt-1">
              {player.nationality} · {player.age}세
            </p>
            {stat && (
              <div className="flex items-center gap-2 mt-2">
                <img src={stat.team.logo} alt="" className="w-4 h-4" />
                <span className="text-sm text-gray-300">{stat.team.name}</span>
                <span className="text-xs text-gray-600">· {stat.games.position}</span>
              </div>
            )}
          </div>
        </div>

        {stat && (
          <>
            <div className="grid grid-cols-4 gap-3 mt-6">
              <StatBox label="출전" value={stat.games.appearences ?? "-"} />
              <StatBox label="골" value={stat.goals.total ?? 0} />
              <StatBox label="도움" value={stat.goals.assists ?? 0} />
              <StatBox label="평점" value={stat.games.rating ?? "-"} />
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mt-4">
              <h2 className="text-sm font-semibold text-gray-400 mb-4">
                {stat.league.name} 시즌 세부 기록
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">출전 시간</span>
                  <span className="text-gray-200">{stat.games.minutes ?? "-"}분</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">슈팅 (유효)</span>
                  <span className="text-gray-200">
                    {stat.shots.total ?? "-"} ({stat.shots.on ?? "-"})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">패스 (성공률)</span>
                  <span className="text-gray-200">
                    {stat.passes.total ?? "-"} ({stat.passes.accuracy ?? "-"}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">드리블 시도 (성공)</span>
                  <span className="text-gray-200">
                    {stat.dribbles.attempts ?? "-"} ({stat.dribbles.success ?? "-"})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">듀얼 시도 (승리)</span>
                  <span className="text-gray-200">
                    {stat.duels.total ?? "-"} ({stat.duels.won ?? "-"})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">경고 / 퇴장</span>
                  <span className="text-gray-200">
                    🟨 {stat.cards.yellow ?? 0} · 🟥 {stat.cards.red ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}