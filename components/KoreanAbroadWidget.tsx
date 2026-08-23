import Link from "next/link"
import PlayerAvatar from "@/components/PlayerAvatar"
import { KOREAN_PLAYERS_ABROAD } from "@/lib/koreanPlayersAbroad"
import { MOCK_KOREAN_ABROAD } from "@/lib/mockData"
import { saveCachedPlayerStat, getCachedPlayerStat, type CachedPlayerStat } from "@/lib/playerStatCache"

type PlayerStat = CachedPlayerStat

async function fetchPlayerStat(playerId: number, season: number, useCache: boolean) {
  const url = `https://v3.football.api-sports.io/players?id=${playerId}&season=${season}`
  const res = await fetch(url, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
    ...(useCache ? { next: { revalidate: 300 } } : { cache: "no-store" as const }),
  })
  return res.json()
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getPlayerStat(playerId: number, season: number): Promise<PlayerStat | null> {
  let data = await fetchPlayerStat(playerId, season, true)

  // 1차 실패 -> 짧게 대기 후 캐시 없이 재시도 (순간적인 레이트리밋 완화)
  if (!data.response?.[0]) {
    console.log(`=== 1차 조회 실패, 잠시 후 no-store로 재시도: id=${playerId} ===`)
    await sleep(400)
    data = await fetchPlayerStat(playerId, season, false)
  }

  const fresh: PlayerStat | null = data.response?.[0] ?? null

  if (fresh) {
    // 성공했으면 DB에 최신값 저장 (다음번 실패에 대비)
    await saveCachedPlayerStat(playerId, fresh)
    return fresh
  }

  // API가 두 번 다 실패하면, 화면에서 선수가 사라지는 대신 DB에 저장된 마지막 성공값을 대신 보여줌
  console.log(`=== 한국인 해외파 선수 조회 최종 실패, DB 캐시로 대체: id=${playerId}, season=${season} ===`)
  console.log("errors:", data.errors)
  return getCachedPlayerStat(playerId)
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
              <PlayerAvatar
                src={p.player.photo}
                alt={p.player.name}
                className="w-12 h-12 rounded-full bg-turf-line object-cover mb-2 text-sm"
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
