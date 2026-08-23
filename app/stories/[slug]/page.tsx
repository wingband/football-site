import Link from "next/link"
import type { Metadata } from "next"
import { getArticleBySlug } from "@/lib/articles"

export const dynamic = "force-dynamic"

const LEAGUE_LOGOS: Record<string, string> = {
  "Premier League":        "/leagues/pl.png",
  "Champions League":      "/leagues/cl.png",
  "UEFA Champions League": "/leagues/cl.png",
  "La Liga":               "/leagues/laliga.png",
  "Bundesliga":            "/leagues/bundesliga.png",
  "Serie A":               "/leagues/seriea.png",
  "Ligue 1":               "/leagues/ligue1.png",
  "Europa League":         "/leagues/europa.png",
  "UEFA Europa League":    "/leagues/europa.png",
  "K League 1":            "/leagues/kleague.png",
  "FA Cup":                "/leagues/facup.png",
}

function getLeagueLogo(leagueName: string): string | null {
  const entry = Object.entries(LEAGUE_LOGOS).find(
    ([k]) => leagueName.includes(k) || k.includes(leagueName.split(" ")[0])
  )
  return entry?.[1] ?? null
}

function TeamBadge({ name }: { name: string }) {
  const initials = name.split(/[\s-]/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()
  return (
    <div className="w-16 h-16 rounded-full bg-turf-line/60 border-2 border-turf-line flex items-center justify-center text-lg font-bold text-floodlight/80 shrink-0">
      {initials}
    </div>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const a = await getArticleBySlug(slug)
  if (!a) return { title: "기사를 찾을 수 없습니다" }

  const score = a.homeScore !== null && a.awayScore !== null ? `${a.homeScore}-${a.awayScore}` : "vs"
  const title = `${a.homeTeam} ${score} ${a.awayTeam} 경기 리뷰 — ${a.leagueName}`
  const description = a.homeScore !== null && a.awayScore !== null
    ? `${a.leagueName} ${a.homeTeam} ${score} ${a.awayTeam} 경기 분석. ${a.content.slice(0, 80)}...`
    : `${a.leagueName} ${a.homeTeam} vs ${a.awayTeam} 경기 리뷰. ${a.content.slice(0, 80)}...`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
  }
}

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

  const score = article.homeScore !== null && article.awayScore !== null
    ? `${article.homeScore} - ${article.awayScore}`
    : "vs"
  const leagueLogo = getLeagueLogo(article.leagueName)

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-2xl mx-auto px-4 pb-16">

        {/* 리그 배지 */}
        <div className="flex items-center gap-2 pt-8 mb-6">
          {leagueLogo && <img src={leagueLogo} alt="" className="w-5 h-5" />}
          <span className="text-xs text-floodlight/50 font-medium uppercase tracking-wide">
            {article.leagueName}
          </span>
          <span className="text-floodlight/20 text-xs ml-auto">
            {new Date(article.createdAt).toLocaleDateString("ko-KR")}
          </span>
        </div>

        {/* 팀 엠블럼 + 스코어 */}
        <div className="flex items-center justify-center gap-6 py-6 border-y border-turf-line/30 mb-6">
          <div className="flex flex-col items-center gap-2 flex-1">
            <TeamBadge name={article.homeTeam} />
            <p className="text-sm font-semibold text-center leading-tight">{article.homeTeam}</p>
          </div>
          <div className="text-center shrink-0">
            <p className="font-data font-bold text-3xl text-score-amber">{score}</p>
            <p className="text-[10px] text-floodlight/30 mt-1">풀타임</p>
          </div>
          <div className="flex flex-col items-center gap-2 flex-1">
            <TeamBadge name={article.awayTeam} />
            <p className="text-sm font-semibold text-center leading-tight">{article.awayTeam}</p>
          </div>
        </div>

        {/* 제목 */}
        <h1 className="font-display text-2xl text-floodlight mb-6 leading-tight">
          {article.title}
        </h1>

        {/* 본문 */}
        <div className="bg-turf/40 border-l-2 border-score-amber p-6">
          <p className="text-[15px] text-floodlight/85 leading-relaxed whitespace-pre-line">
            {article.content}
          </p>
        </div>

        {/* 하단 링크 */}
        <div className="flex justify-between mt-6 text-sm">
          <Link href="/stories" className="text-floodlight/50 hover:text-score-amber transition-colors">
            ← 전체 리뷰 목록
          </Link>
          <Link href={`/matches/${article.matchId}`} className="text-floodlight/50 hover:text-score-amber transition-colors">
            경기 상세 보기 →
          </Link>
        </div>
      </div>
    </main>
  )
}
