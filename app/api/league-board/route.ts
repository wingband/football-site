import { NextResponse } from "next/server"
import { getLeagueBoard } from "@/lib/leagueBoard"

// 메인 화면 리그 탭 전환용. Vercel CDN에 30분 캐시해서 탭을 눌러도 서버 함수가 거의 안 돈다
export async function GET(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("league"))
  const data = Number.isFinite(id) ? await getLeagueBoard(id) : null
  if (!data) return NextResponse.json({ error: "unknown league" }, { status: 400 })
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  })
}
