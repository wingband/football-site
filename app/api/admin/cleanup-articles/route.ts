import { NextRequest, NextResponse } from "next/server"
import { deleteShortArticles } from "@/lib/articles"

// 500자 미만 짧은 기사를 삭제하는 일회성 관리 엔드포인트.
// 크론 재실행 시 해당 경기 기사가 재생성된다.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 })
  }

  const minLength = Number(req.nextUrl.searchParams.get("minLength") ?? "500")
  const deleted = await deleteShortArticles(minLength)

  return NextResponse.json({
    ok: true,
    deletedCount: deleted.length,
    slugs: deleted,
  })
}
