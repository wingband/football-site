
import Link from "next/link"
import type { Metadata } from "next"
import { getArticleBySlug } from "@/lib/articles"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article) return { title: "기사를 찾을 수 없습니다" }

  return {
    title: article.title,
    description: article.content.slice(0, 100),
  }
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
        <p className="text-floodlight/50">기사를 찾을 수 없습니다.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs text-score-amber font-data mb-2">{article.leagueName}</p>
        <h1 className="font-display text-2xl text-floodlight mb-2 leading-tight">
          {article.title}
        </h1>
        <p className="text-xs text-floodlight/30 mb-8">
          {new Date(article.createdAt).toLocaleDateString("ko-KR")}
        </p>

        <div className="bg-turf/40 border-l-2 border-score-amber p-6">
          <p className="text-[15px] text-floodlight/85 leading-relaxed whitespace-pre-line">
            {article.content}
          </p>
        </div>

        <div className="flex justify-between mt-6 text-sm">
          <Link href="/stories" className="text-floodlight/50 hover:text-score-amber">
            ← 전체 리뷰 목록
          </Link>
          <Link
            href={`/matches/${article.matchId}`}
            className="text-floodlight/50 hover:text-score-amber"
          >
            경기 상세 보기 →
          </Link>
        </div>
      </div>
    </main>
  )
}
