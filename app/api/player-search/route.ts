import { NextResponse } from "next/server"
import { KOREAN_PLAYERS_ABROAD } from "@/lib/koreanPlayersAbroad"
import { fetchApiFootball } from "@/lib/apiFootballClient"

export type PlayerSearchResult = {
  id: number
  name: string
  photo: string
  team: string | null
  league: string | null
}

const CDN_PHOTO = (id: number) => `https://media.api-sports.io/football/players/${id}.png`

function searchKoreanList(q: string): PlayerSearchResult[] {
  const needle = q.replace(/\s/g, "")
  return KOREAN_PLAYERS_ABROAD.filter((p) => p.name.replace(/\s/g, "").includes(needle)).map((p) => ({
    id: p.id,
    name: p.name,
    photo: CDN_PHOTO(p.id),
    team: p.teamName,
    league: p.league,
  }))
}

// (2026-09-20) 기존엔 res.ok만 확인하고 errors 필드를 체크하지 않아서, API
// 레이트리밋 시 "검색 결과 없음"으로 오인될 수 있었다. fetchApiFootball()로 통합.
async function searchApi(q: string, season: number): Promise<PlayerSearchResult[]> {
  if (q.length < 4) return []

  try {
    const response = await fetchApiFootball(
      `/players?search=${encodeURIComponent(q)}&season=${season}`,
      { revalidate: 86400 }
    )

    return (response as {
      player: { id: number; name: string; photo: string }
      statistics?: { team?: { name?: string }; league?: { name?: string } }[]
    }[]).map((r) => ({
      id: r.player.id,
      name: r.player.name,
      photo: r.player.photo ?? CDN_PHOTO(r.player.id),
      team: r.statistics?.[0]?.team?.name ?? null,
      league: r.statistics?.[0]?.league?.name ?? null,
    }))
  } catch (err) {
    console.error("선수 검색 실패:", err instanceof Error ? err.message : err)
    return []
  }
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim()
  if (q.length < 2) return NextResponse.json({ players: [] })

  const [local, remote] = await Promise.all([
    Promise.resolve(searchKoreanList(q)),
    searchApi(q, new Date().getFullYear()),
  ])

  const seen = new Set<number>()
  const players: PlayerSearchResult[] = []
  for (const p of [...local, ...remote]) {
    if (seen.has(p.id)) continue
    seen.add(p.id)
    players.push(p)
    if (players.length >= 12) break
  }

  return NextResponse.json(
    { players },
    { headers: { "Cache-Control": "s-maxage=86400, stale-while-revalidate=604800" } }
  )
}
