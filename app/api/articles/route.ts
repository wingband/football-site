import { NextResponse } from "next/server"
import { getAllArticles } from "@/lib/articles"

export const dynamic = "force-dynamic"

// matchId로 팀 로고를 가져오는 함수 (캐시 활용)
async function fetchTeamLogos(matchId: number): Promise<{ homeLogo: string | null; awayLogo: string | null }> {
  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?id=${matchId}`,
      {
        headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
        next: { revalidate: 86400 }, // 24시간 캐시
      }
    )
    const data = await res.json()
    const fixture = data.response?.[0]
    return {
      homeLogo: fixture?.teams?.home?.logo ?? null,
      awayLogo: fixture?.teams?.away?.logo ?? null,
    }
  } catch {
    return { homeLogo: null, awayLogo: null }
  }
}

export async function GET() {
  try {
    const articles = await getAllArticles()

    // 팀 로고를 병렬로 가져오기 (최대 10개만, API rate limit 고려)
    const withLogos = await Promise.all(
      articles.slice(0, 30).map(async (a) => {
        const { homeLogo, awayLogo } = await fetchTeamLogos(a.matchId)
        return { ...a, homeLogo, awayLogo }
      })
    )

    // 나머지는 로고 없이
    const rest = articles.slice(30).map((a) => ({ ...a, homeLogo: null, awayLogo: null }))

    return NextResponse.json({ articles: [...withLogos, ...rest] })
  } catch {
    return NextResponse.json({ articles: [] })
  }
}
