import Link from "next/link"
import type { Metadata } from "next"
import { getAllArticles } from "@/lib/articles"

// 이 페이지는 매일 자동으로 쌓이는 기사 목록이라, 빌드 시점에 정적으로 굳히면 안 됨.
// 빌드 중 Neon DB 연결 시도로 배포가 실패하던 문제도 이걸로 같이 해결됨
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "경기 리뷰 아카이브",
  description: "매일 자동으로 쌓이는 주요 경기 리뷰와 분석 기사 모음.",
}

export default async function StoriesPage() {
  const articles = await getAllArticles()

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display uppercase text-xl text-score-amber mb-1">경기 리뷰</h1>
        <p className="text-xs text-floodlight/40 mb-8">
          매일 자동으로 작성되는 주요 경기 분석 기사 ({articles.length}개)
        </p>

        {articles.length === 0 && (
          <p className="text-floodlight/40 text-sm">
            아직 생성된 기사가 없습니다. 자동 생성이 실행되면 이곳에 쌓입니다.
          </p>
        )}

        <div className="space-y-3">
          {articles.map((a) => (
            <Link
              key={a.slug}
              href={`/stories/${a.slug}`}
              className="block bg-turf/40 border-l-2 border-score-amber p-4 hover:bg-turf-line/30 transition-colors"
            >
              <p className="text-xs text-floodlight/40 mb-1 font-data">{a.leagueName}</p>
              <h2 className="text-sm font-medium text-floodlight">{a.title}</h2>
              <p className="text-[11px] text-floodlight/30 mt-2">
                {new Date(a.createdAt).toLocaleDateString("ko-KR")}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}