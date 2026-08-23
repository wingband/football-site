import { redirect } from "next/navigation"
import { getArticleBySlug } from "@/lib/articles"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const a = await getArticleBySlug(slug)
  if (!a) return { title: "기사를 찾을 수 없습니다" }

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

  if (!article) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
        <p className="text-floodlight/50">기사를 찾을 수 없습니다.</p>
      </main>
    )
  }

  // 경기 상세 페이지로 바로 이동 — 팩트 탭에 Match Review가 표시됨
  redirect(`/matches/${article.matchId}`)
}
