import { NextResponse } from "next/server"
import { KOREAN_PLAYERS_ABROAD } from "@/lib/koreanPlayersAbroad"

export type PlayerSearchResult = {
  id: number
  name: string
  photo: string
  team: string | null
  league: string | null
}

const CDN_PHOTO = (id: number) => `https://media.api-sports.io/football/players/${id}.png`

// 해외파 목록은 한국어 이름을 갖고 있어서, "손흥민" 같은 한글 검색어를 여기서 처리한다.
// API-Football은 로마자 이름만 알고 있고 검색어도 4글자 이상만 받기 때문에
// 한글 3글자 이름은 API로는 절대 못 찾음 → 로컬 목록 매칭이 반드시 필요
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

async function searchApi(q: string, season: number): Promise<PlayerSearchResult[]> {
  // API-Football 제약: search 파라미터는 4글자 이상
  if (q.length < 4) return []

  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/players?search=${encodeURIComponent(q)}&season=${season}`,
      {
        headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
        next: { revalidate: 86400 },
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    const rows = Array.isArray(data.response) ? data.response : []

    return rows.map((r: {
      player: { id: number; name: string; photo: string }
      statistics?: { team?: { name?: string }; league?: { name?: string } }[]
    }) => ({
      id: r.player.id,
      name: r.player.name,
      photo: r.player.photo ?? CDN_PHOTO(r.player.id),
      team: r.statistics?.[0]?.team?.name ?? null,
      league: r.statistics?.[0]?.league?.name ?? null,
    }))
  } catch (err) {
    console.error("선수 검색 실패:", err)
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

  // 해외파 목록을 먼저 보여주고(한국어 이름이라 알아보기 쉬움) 중복 id는 제거
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
