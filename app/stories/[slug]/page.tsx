import { redirect, notFound } from "next/navigation"
import { getArticleBySlug } from "@/lib/articles"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const a = await getArticleBySlug(slug)
  if (!a) return { title: "기사를 찾을 수 없습니다", robots: { index: false, follow: false } }

  const score = a.homeScore !== null && a.awayScore !== null ? `${a.homeScore}-${a.awayScore}` : "vs"
  const title = `${a.homeTeam} ${score} ${a.awayTeam} 경기 리뷰 — ${a.leagueName}`
  const description = `${a.leagueName} ${a.homeTeam} ${score} ${a.awayTeam} 경기 분석. ${a.content.slice(0, 120)}...`

  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
  }
}

// /stories/[slug] → /matches/[matchId] 로 리다이렉트
// 경기 상세 페이지에 이미 Match Review, 통계, 라인업, xG 등 모든 정보가 있음
export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  // 없는 기사는 200 + "찾을 수 없음" 화면(Soft 404) 대신 진짜 404로 (2026-10-11 Search Console 대응)
  if (!article) notFound()

  // 경기 상세 페이지로 이동 — from=review 파라미터로 "뒤로" 버튼을 "리뷰"로 표시
  redirect(`/matches/${article.matchId}?from=review`)
}
