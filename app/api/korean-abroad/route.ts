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
    { headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! }, next: { revalidate: 1800 } }
  )
  return res.json()
}

async function fetchLastMatch(playerId: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?player=${playerId}&last=1`,
      { headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! }, next: { revalidate: 3600 } }
    )
    const data = await res.json()
    return data.response?.[0]?.fixture?.date ?? null
  } catch {
    return null
  }
}

export async function GET() {
  const season = new Date().getFullYear()

  const players = await Promise.all(
    KOREAN_PLAYERS_ABROAD.map(async (player) => {
      try {
        let data = await fetchStat(player.id, season)
        if (!data.response?.[0]) {
          data = await fetchStat(player.id, season - 1)
        }

        const raw = data.response?.[0] ?? null
        let stat = null

        if (raw) {
          await saveCachedPlayerStat(player.id, raw)
          stat = getClubStat(raw.statistics ?? [])
        } else {
          const cached = await getCachedPlayerStat(player.id)
          if (cached) stat = getClubStat(cached.statistics ?? [])
        }

        // 최근 경기 날짜 (정렬용)
        const lastMatchDate = await fetchLastMatch(player.id)

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
          lastMatchDate,
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
          lastMatchDate: null,
        }
      }
    })
  )

  // tier 내에서 최근 경기 날짜 순 정렬 (최신이 위)
  const sorted = [...players].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier
    const dateA = a.lastMatchDate ? new Date(a.lastMatchDate).getTime() : 0
    const dateB = b.lastMatchDate ? new Date(b.lastMatchDate).getTime() : 0
    return dateB - dateA
  })

  return NextResponse.json({ players: sorted }, {
    headers: { "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600" },
  })
}
