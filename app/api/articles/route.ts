import { NextResponse } from "next/server"
import { getAllArticles } from "@/lib/articles"

export const dynamic = "force-dynamic"

// matchId → 팀 로고 메모리 캐시 (서버 재시작 전까지 유지)
const logoCache = new Map<number, { homeLogo: string | null; awayLogo: string | null }>()

async function fetchTeamLogos(matchId: number): Promise<{ homeLogo: string | null; awayLogo: string | null }> {
  if (logoCache.has(matchId)) return logoCache.get(matchId)!

  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?id=${matchId}`,
      {
        headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
        next: { revalidate: 86400 },
      }
    )
    const data = await res.json()
    const fixture = data.response?.[0]
    const result = {
      homeLogo: fixture?.teams?.home?.logo ?? null,
      awayLogo: fixture?.teams?.away?.logo ?? null,
    }
    logoCache.set(matchId, result)
    return result
  } catch {
    return { homeLogo: null, awayLogo: null }
  }
}

export async function GET() {
  try {
    const articles = await getAllArticles()

    // 한 번에 최대 8개만 로고 가져오기 (rate limit 방지)
    // 나머지는 이니셜로 표시
    const withLogos = await Promise.all(
      articles.slice(0, 8).map(async (a) => {
        const logos = await fetchTeamLogos(a.matchId)
        return { ...a, ...logos }
      })
    )
    const rest = articles.slice(8).map((a) => ({ ...a, homeLogo: null, awayLogo: null }))

    return NextResponse.json({ articles: [...withLogos, ...rest] })
  } catch {
    return NextResponse.json({ articles: [] })
  }
}
