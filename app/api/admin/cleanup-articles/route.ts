import { NextRequest, NextResponse } from "next/server"
import { deleteShortArticles, deleteArticlesMissingLogos } from "@/lib/articles"

// 짧은 기사(500자 미만) + 로고 없는 기사를 삭제하는 관리용 엔드포인트.
// Vercel Cron Jobs 탭에서 다른 크론들과 동일하게 "Run"으로 수동 실행 가능.
// 크론(generate-articles) 재실행 시 삭제된 경기 기사가 재생성된다.
export async function GET(req: NextRequest) {
  // 브라우저 주소창에 바로 붙여넣어 실행할 수 있도록 ?secret= 쿼리도 허용
  // (Bearer 헤더는 브라우저에서 직접 넣기 번거로움)
  const authHeader = req.headers.get("authorization")
  const secretParam = req.nextUrl.searchParams.get("secret")
  const isAuthorized =
    !process.env.CRON_SECRET ||
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    secretParam === process.env.CRON_SECRET
  if (!isAuthorized) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 })
  }

  const minLength = Number(req.nextUrl.searchParams.get("minLength") ?? "500")
  const shortSlugs = await deleteShortArticles(minLength)
  const missingLogoSlugs = await deleteArticlesMissingLogos()

  const deleted = Array.from(new Set([...shortSlugs, ...missingLogoSlugs]))

  return NextResponse.json({
    ok: true,
    deletedCount: deleted.length,
    slugs: deleted,
  })
}
