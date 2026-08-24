import { NextResponse } from "next/server"
import { getAllArticles } from "@/lib/articles"

export const dynamic = "force-dynamic"

// 팀 로고는 기사 생성(크론) 시점에 이미 DB에 저장되므로 여기서 별도로 조회하지 않는다.
// (과거에는 요청마다 API-Football을 호출해서 로고를 가져왔는데, rate limit에 취약했음)
export async function GET() {
  try {
    const articles = await getAllArticles()
    return NextResponse.json({ articles })
  } catch {
    return NextResponse.json({ articles: [] })
  }
}
