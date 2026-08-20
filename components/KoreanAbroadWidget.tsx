import Link from "next/link"
import { KOREAN_PLAYERS_ABROAD } from "@/lib/koreanPlayersAbroad"
import { MOCK_KOREAN_ABROAD } from "@/lib/mockData"

type PlayerStat = {
  player: { id: number; name: string; photo: string }
  statistics: {
    team: { name: string; logo: string }
    league: { name: string }
    games: { appearences: number | null; rating: string | null }
    goals: { total: number | null; assists: number | null }
  }[]
}

async function getPlayerStat(playerId: number, season: number): Promise<PlayerStat | null> {
  const res = await fetch(
    `https://v3.football.api-sports.io/players?id=${playerId}&season=${season}`,
    {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      next: { revalidate: 3600 },
    }
  )
  const data = await res.json()

  // 디버깅용 — Vercel 대시보드의 Logs에서 확인
  if (!data.response?.[0]) {
    console.log(`=== 한국인 해외파 선수 조회 실패: id=${playerId}, season=${season} ===`)
    console.log("errors:", data.errors)
    console.log("results:", data.results)
  }

  return data.response?.[0] ?? null
}

async function getAllKoreanAbroad(): Promise<PlayerStat[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_KOREAN_ABROAD

  const season = new Date().getFullYear()
  const results = await Promise.all(
    KOREAN_PLAYERS_ABROAD.map((p) => getPlayerStat(p.id, season))
  )
  return results.filter((r): r is PlayerStat => r !== null)
}

export default async function KoreanAbroadWidget() {
  const players = await getAllKoreanAbroad()

  if (players.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🇰🇷</span>
        <h2 className="font-display uppercase text-sm text-score-amber tracking-wide">
          한국인 해외파 트래커
        </h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {players.map((p) => {
          const stat = p.statistics[0]
          if (!stat) return null
          return (
            <Link
              key={p.player.id}
              href={`/players/${p.player.id}`}
              className="shrink-0 w-40 bg-turf/40 border-l-2 border-score-amber p-4 hover:bg-turf-line/30 transition-colors"
            >
              <img
                src={p.player.photo}
                alt=""
                className="w-12 h-12 rounded-full bg-turf-line object-cover mb-2"
              />
              <p className="text-sm font-medium text-floodlight truncate">{p.player.name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <img src={stat.team.logo} alt="" className="w-3.5 h-3.5" />
                <span className="text-[11px] text-floodlight/50 truncate">{stat.team.name}</span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs font-data">
                <span className="text-score-amber">⚽{stat.goals.total ?? 0}</span>
                <span className="text-floodlight/40">🅰️{stat.goals.assists ?? 0}</span>
                {stat.games.rating && (
                  <span className="text-floodlight/40 ml-auto">{stat.games.rating}</span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
