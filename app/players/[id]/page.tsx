import type { Metadata } from "next"
import { getSeasonYear } from "@/lib/season"
import { MOCK_PLAYER, MOCK_TROPHIES } from "@/lib/mockData"

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

type Trophy = {
  league: string
  country: string
  season: string
  place: string
}

async function getPlayer(playerId: string, season: number): Promise<PlayerData | null> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_PLAYER

  const res = await fetch(
    `https://v3.football.api-sports.io/players?id=${playerId}&season=${season}`,
    {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      next: { revalidate: 3600 },
    }
  )
  const data = await res.json()
  return data.response?.[0] ?? null
}

async function getTrophies(playerId: string): Promise<Trophy[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TROPHIES

  const res = await fetch(
    `https://v3.football.api-sports.io/trophies?player=${playerId}`,
    {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      next: { revalidate: 3600 },
    }
  )
  const data = await res.json()
  return data.response ?? []
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-turf/40 border-l-2 border-score-amber p-4 text-center">
      <p className="font-display text-2xl text-score-amber">{value}</p>
      <p className="text-xs text-floodlight/40 mt-1">{label}</p>
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
      <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
        <p className="text-floodlight/40">선수 정보를 찾을 수 없습니다.</p>
      </main>
    )
  }

  const { player } = data
  const stat = data.statistics.sort(
    (a, b) => (b.games.appearences ?? 0) - (a.games.appearences ?? 0)
  )[0]

  const trophies = await getTrophies(id)
  const winnerTrophies = trophies.filter((t) => t.place.toLowerCase().includes("winner"))
  const otherTrophies = trophies.filter((t) => !t.place.toLowerCase().includes("winner"))

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-5 bg-turf/40 border-l-2 border-score-amber p-6">
          <img
            src={player.photo}
            alt=""
            className="w-24 h-24 rounded-full bg-turf-line object-cover border-2 border-score-amber"
          />
          <div>
            <h1 className="font-display uppercase text-xl">{player.name}</h1>
            <p className="text-xs text-floodlight/40 mt-1">
              {player.nationality} · {player.age}세
            </p>
            {stat && (
              <div className="flex items-center gap-2 mt-2">
                <img src={stat.team.logo} alt="" className="w-4 h-4" />
                <span className="text-sm text-floodlight/80">{stat.team.name}</span>
                <span className="text-xs text-floodlight/30">· {stat.games.position}</span>
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

            <div className="bg-turf/40 border-l-2 border-score-amber p-5 mt-4">
              <h2 className="text-sm font-display uppercase tracking-wide text-floodlight/60 mb-4">
                {stat.league.name} 시즌 세부 기록
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-floodlight/40">출전 시간</span>
                  <span className="text-floodlight/90 font-data">{stat.games.minutes ?? "-"}분</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-floodlight/40">슈팅 (유효)</span>
                  <span className="text-floodlight/90 font-data">
                    {stat.shots.total ?? "-"} ({stat.shots.on ?? "-"})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-floodlight/40">패스 (성공률)</span>
                  <span className="text-floodlight/90 font-data">
                    {stat.passes.total ?? "-"} ({stat.passes.accuracy ?? "-"}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-floodlight/40">드리블 시도 (성공)</span>
                  <span className="text-floodlight/90 font-data">
                    {stat.dribbles.attempts ?? "-"} ({stat.dribbles.success ?? "-"})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-floodlight/40">듀얼 시도 (승리)</span>
                  <span className="text-floodlight/90 font-data">
                    {stat.duels.total ?? "-"} ({stat.duels.won ?? "-"})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-floodlight/40">경고 / 퇴장</span>
                  <span className="text-floodlight/90 font-data">
                    🟨 {stat.cards.yellow ?? 0} · 🟥 {stat.cards.red ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {trophies.length > 0 && (
          <div className="bg-turf/40 border-l-2 border-score-amber p-5 mt-4">
            <h2 className="text-sm font-display uppercase tracking-wide text-floodlight/60 mb-4">
              트로피
            </h2>
            <div className="space-y-2">
              {winnerTrophies.map((t, i) => (
                <div key={`w-${i}`} className="flex items-center gap-2 text-sm">
                  <span className="text-score-amber">🏆</span>
                  <span className="flex-1 text-floodlight/90">
                    {t.league} ({t.country})
                  </span>
                  <span className="text-xs text-floodlight/40 font-data">{t.season}</span>
                </div>
              ))}
              {otherTrophies.slice(0, 5).map((t, i) => (
                <div key={`o-${i}`} className="flex items-center gap-2 text-sm text-floodlight/50">
                  <span>🥈</span>
                  <span className="flex-1">
                    {t.league} ({t.country}) · {t.place}
                  </span>
                  <span className="text-xs text-floodlight/30 font-data">{t.season}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}