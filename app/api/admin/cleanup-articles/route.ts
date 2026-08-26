import { NextRequest, NextResponse } from "next/server"
import { deleteShortArticles, deleteArticlesMissingLogos, deleteArticleByTeams } from "@/lib/articles"

// 짧은 기사(500자 미만) + 로고 없는 기사를 삭제하는 관리용 엔드포인트.
// ?homeTeam=&awayTeam= 을 주면 그 경기 기사 하나만 지운다 (팀명 부분 일치).
// 크론(generate-articles) 재실행 시 삭제된 경기 기사가 재생성된다.
// 삭제 동작이라 조회용 엔드포인트들과 달리 CRON_SECRET 인증을 유지한다.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const secretParam = req.nextUrl.searchParams.get("secret")
  const isAuthorized =
    !process.env.CRON_SECRET ||
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    secretParam === process.env.CRON_SECRET
  if (!isAuthorized) {
    return NextResponse.json({ error: "인증 실패 — Vercel 환경변수의 CRON_SECRET 값을 ?secret= 뒤에 붙여주세요" }, { status: 401 })
  }

  const homeTeam = req.nextUrl.searchParams.get("homeTeam")
  const awayTeam = req.nextUrl.searchParams.get("awayTeam")

  if (homeTeam && awayTeam) {
    const deleted = await deleteArticleByTeams(homeTeam, awayTeam)
    return NextResponse.json({ ok: true, deletedCount: deleted.length, slugs: deleted })
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
