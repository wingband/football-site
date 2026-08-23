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
  return Object.entries(LEAGUE_LOGOS).find(
    ([k]) => leagueName.includes(k) || k.includes(leagueName.split(" ")[0])
  )?.[1] ?? null
}

// matchId로 팀 로고 가져오기
async function getTeamLogos(matchId: number) {
  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?id=${matchId}`,
      {
        headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
        next: { revalidate: 86400 },
      }
    )
    const data = await res.json()
    const f = data.response?.[0]
    return {
      homeLogo: f?.teams?.home?.logo ?? null,
      awayLogo: f?.teams?.away?.logo ?? null,
      fixtureId: f?.fixture?.id ?? matchId,
    }
  } catch {
    return { homeLogo: null, awayLogo: null, fixtureId: matchId }
  }
}

function TeamDisplay({ name, logo }: { name: string; logo: string | null }) {
  const initials = name.split(/[\s-]/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()
  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      {logo ? (
        <img src={logo} alt={name} className="w-16 h-16 object-contain" />
      ) : (
        <div className="w-16 h-16 rounded-full bg-turf-line/60 border-2 border-turf-line flex items-center justify-center text-lg font-bold text-floodlight/80">
          {initials}
        </div>
      )}
      <p className="text-sm font-semibold text-center leading-tight">{name}</p>
    </div>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const a = await getArticleBySlug(slug)
  if (!a) return { title: "기사를 찾을 수 없습니다" }

  const score = a.homeScore !== null && a.awayScore !== null ? `${a.homeScore}-${a.awayScore}` : "vs"
  const title = `${a.homeTeam} ${score} ${a.awayTeam} 경기 리뷰 — ${a.leagueName}`
  const description = `${a.leagueName} ${a.homeTeam} ${score} ${a.awayTeam} 경기 분석. ${a.content.slice(0, 100)}...`

  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
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

  const { homeLogo, awayLogo, fixtureId } = await getTeamLogos(article.matchId)
  const score = article.homeScore !== null && article.awayScore !== null
    ? `${article.homeScore} - ${article.awayScore}`
    : "vs"
  const leagueLogo = getLeagueLogo(article.leagueName)

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-2xl mx-auto px-4 pb-16">

        {/* 리그 + 날짜 */}
        <div className="flex items-center gap-2 pt-8 mb-6">
          {leagueLogo && <img src={leagueLogo} alt="" className="w-5 h-5" />}
          <span className="text-xs text-floodlight/50 font-medium uppercase tracking-wide">
            {article.leagueName}
          </span>
          <span className="text-floodlight/20 text-xs ml-auto">
            {new Date(article.createdAt).toLocaleDateString("ko-KR")}
          </span>
        </div>

        {/* 팀 로고 + 스코어 */}
        <div className="flex items-center justify-center gap-6 py-8 border-y border-turf-line/30 mb-6">
          <TeamDisplay name={article.homeTeam} logo={homeLogo} />
          <div className="text-center shrink-0 px-4">
            <p className="font-data font-bold text-4xl text-score-amber">{score}</p>
            <p className="text-[10px] text-floodlight/30 mt-1">풀타임</p>
          </div>
          <TeamDisplay name={article.awayTeam} logo={awayLogo} />
        </div>

        {/* Match Review 헤더 */}
        <div className="border border-score-amber/40 bg-score-amber/5 overflow-hidden mb-6">
          <div className="flex items-center gap-2 px-5 py-3 bg-score-amber/10 border-b border-score-amber/20">
            <span className="text-score-amber text-xs">✦</span>
            <h3 className="font-display uppercase tracking-widest text-xs text-score-amber font-bold">
              Match Review
            </h3>
            <span className="text-score-amber text-xs ml-auto">AI 작성</span>
          </div>
          <div className="p-5">
            <h1 className="font-semibold text-base text-floodlight mb-3 leading-snug">
              {article.title}
            </h1>
            <p className="text-sm text-floodlight/75 leading-relaxed whitespace-pre-line">
              {article.content}
            </p>
          </div>
        </div>

        {/* 하단 링크 */}
        <div className="flex justify-between text-sm">
          <Link href="/stories" className="text-floodlight/50 hover:text-score-amber transition-colors">
            ← 전체 리뷰 목록
          </Link>
          <Link href={`/matches/${fixtureId}`} className="text-floodlight/50 hover:text-score-amber transition-colors">
            경기 상세 보기 →
          </Link>
        </div>
      </div>
    </main>
  )
}
