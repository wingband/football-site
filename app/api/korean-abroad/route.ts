import { NextResponse } from "next/server"
import { KOREAN_PLAYERS_ABROAD } from "@/lib/koreanPlayersAbroad"
import { saveCachedPlayerStat, getCachedPlayerStat } from "@/lib/playerStatCache"

const NATIONAL_KW = ["World Cup", "AFC", "Asian", "Olympic", "Friendlies", "Qualification", "Nations", "Copa", "EURO"]

function getClubStat(statistics: { league: { name: string }; games: { appearences: number | null; minutes: number | null; rating: string | null }; goals: { total: number | null; assists: number | null }; shots?: { total: number | null; on: number | null }; passes?: { accuracy: number | null } }[]) {
  return statistics.find((s) => !NATIONAL_KW.some((kw) => s.league.name.includes(kw))) ?? null
}

async function fetchStat(playerId: number, season: number) {
  const res = await fetch(
    `https://v3.football.api-sports.io/players?id=${playerId}&season=${season}`,
    {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      next: { revalidate: 1800 }, // 30분 캐시
    }
  )
  return res.json()
}

export async function GET() {
  const season = new Date().getFullYear()

  const players = await Promise.all(
    KOREAN_PLAYERS_ABROAD.map(async (player) => {
      try {
        let data = await fetchStat(player.id, season)
        // 이번 시즌 데이터 없으면 전 시즌 시도
        if (!data.response?.[0]) {
          data = await fetchStat(player.id, season - 1)
        }

        const raw = data.response?.[0] ?? null
        let stat = null

        if (raw) {
          await saveCachedPlayerStat(player.id, raw)
          stat = getClubStat(raw.statistics ?? [])
        } else {
          // DB 캐시 fallback
          const cached = await getCachedPlayerStat(player.id)
          if (cached) stat = getClubStat(cached.statistics ?? [])
        }

        return {
          id: player.id,
          name: player.name,
          teamName: player.teamName,
          teamLogo: player.teamLogo,
          league: player.league,
          leagueLogo: player.leagueLogo,
          tier: player.tier,
          goals: stat?.goals.total ?? 0,
          assists: stat?.goals.assists ?? 0,
          apps: stat?.games.appearences ?? 0,
          minutes: stat?.games.minutes ?? 0,
          rating: stat?.games.rating ?? null,
        }
      } catch {
        return {
          id: player.id,
          name: player.name,
          teamName: player.teamName,
          teamLogo: player.teamLogo,
          league: player.league,
          leagueLogo: player.leagueLogo,
          tier: player.tier,
          goals: 0,
          assists: 0,
          apps: 0,
          minutes: 0,
          rating: null,
        }
      }
    })
  )

  return NextResponse.json({ players }, {
    headers: { "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600" },
  })
}
