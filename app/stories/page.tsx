"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState, useMemo } from "react"
import type { Article } from "@/lib/articles"
import Logo from "@/components/Logo"

type ArticleWithLogos = Article & { homeLogo: string | null; awayLogo: string | null }

// 리그명 → 로컬 로고 매핑
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

// 주요 리그 탭 순서
const FEATURED_TABS = [
  { label: "Premier League",   logo: "/leagues/pl.png" },
  { label: "Champions League", logo: "/leagues/cl.png" },
  { label: "La Liga",          logo: "/leagues/laliga.png" },
  { label: "Bundesliga",       logo: "/leagues/bundesliga.png" },
  { label: "Serie A",          logo: "/leagues/seriea.png" },
  { label: "Ligue 1",          logo: "/leagues/ligue1.png" },
  { label: "Europa League",    logo: "/leagues/europa.png" },
  { label: "K League 1",       logo: "/leagues/kleague.png" },
]

// 팀 이니셜 원형 (로고 없을 때 fallback)
function TeamBadge({ name, logo, size = "sm" }: { name: string; logo?: string | null; size?: "sm" | "lg" }) {
  const [imgError, setImgError] = useState(false)
  const sz = size === "lg" ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs"

  if (logo && !imgError) {
    return (
      <div className={`${sz} relative rounded-full bg-turf-line/30 shrink-0`}>
        <Image
          src={logo}
          alt={name}
          fill
          sizes="40px"
          className="object-contain rounded-full"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }
  const initials = name.split(/[\s-]/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()
  return (
    <div className={`${sz} rounded-full bg-turf-line/60 border border-turf-line flex items-center justify-center font-bold text-floodlight/80 shrink-0`}>
      {initials}
    </div>
  )
}

// 한 줄 요약 생성
function oneLiner(a: Article): string {
  const score = a.homeScore !== null && a.awayScore !== null
    ? `${a.homeScore}-${a.awayScore}`
    : "vs"
  if (a.homeScore !== null && a.awayScore !== null) {
    const winner = a.homeScore > a.awayScore ? a.homeTeam : a.awayScore > a.homeScore ? a.awayTeam : null
    if (winner) return `${winner}이(가) ${score}으로 승리한 ${a.leagueName} 경기입니다.`
    return `${a.homeTeam} ${score} ${a.awayTeam} — 두 팀이 치열하게 맞붙은 ${a.leagueName} 경기입니다.`
  }
  return `${a.homeTeam} vs ${a.awayTeam} ${a.leagueName} 경기 리뷰입니다.`
}

export default function StoriesPage() {
  const [articles, setArticles] = useState<ArticleWithLogos[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("전체")

  useEffect(() => {
    fetch("/api/articles")
      .then((r) => r.json())
      .then((data) => {
        const list: ArticleWithLogos[] = data.articles ?? []
        setArticles(list)
        // PL 기사가 있으면 기본 탭을 PL로
        const hasPL = list.some((a) => a.leagueName.includes("Premier League"))
        if (hasPL) setActiveTab("Premier League")
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // 탭에 없는 리그들 → "그 외"
  const featuredLabels = new Set(FEATURED_TABS.map((t) => t.label))
  const hasOther = articles.some((a) => !featuredLabels.has(a.leagueName))

  const displayed = useMemo(() => {
    if (activeTab === "전체") return articles
    if (activeTab === "그 외") return articles.filter((a) => !featuredLabels.has(a.leagueName))
    return articles.filter((a) => a.leagueName.includes(activeTab) || activeTab.includes(a.leagueName.split(" ")[0]))
  }, [articles, activeTab])

  // 실제 존재하는 리그만 탭에 표시
  const existingLeagues = new Set(articles.map((a) => a.leagueName))
  const visibleTabs = FEATURED_TABS.filter((t) =>
    articles.some((a) => a.leagueName.includes(t.label) || t.label.includes(a.leagueName.split(" ")[0]))
  )

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <div className="pt-8 pb-4">
          <h1 className="font-display uppercase text-xl text-score-amber">경기 리뷰</h1>
          <p className="text-xs text-floodlight/40 mt-1">
            주요 경기 분석 · {articles.length}개
          </p>
        </div>

        {/* 리그 탭 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* 전체 탭 */}
          <button
            onClick={() => setActiveTab("전체")}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-colors ${
              activeTab === "전체"
                ? "bg-score-amber text-pitch-night font-bold"
                : "bg-turf-line/30 text-floodlight/60 hover:text-floodlight"
            }`}
          >
            전체 ({articles.length})
          </button>

          {/* 주요 리그 탭 */}
          {visibleTabs.map((tab) => {
            const count = articles.filter((a) =>
              a.leagueName.includes(tab.label) || tab.label.includes(a.leagueName.split(" ")[0])
            ).length
            return (
              <button
                key={tab.label}
                onClick={() => setActiveTab(tab.label)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors ${
                  activeTab === tab.label
                    ? "bg-score-amber text-pitch-night font-bold"
                    : "bg-turf-line/30 text-floodlight/60 hover:text-floodlight"
                }`}
              >
                <Logo src={tab.logo} alt="" className="w-4 h-4" />
                {tab.label}
                <span className="opacity-60">({count})</span>
              </button>
            )
          })}

          {/* 그 외 탭 */}
          {hasOther && (
            <button
              onClick={() => setActiveTab("그 외")}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                activeTab === "그 외"
                  ? "bg-score-amber text-pitch-night font-bold"
                  : "bg-turf-line/30 text-floodlight/60 hover:text-floodlight"
              }`}
            >
              그 외
            </button>
          )}
        </div>

        {/* 기사 목록 */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-turf/30 border border-turf-line/30 p-4 animate-pulse h-24 rounded" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <p className="text-floodlight/40 text-sm py-8 text-center">해당 리그 리뷰가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {displayed.map((a) => {
              const leagueLogo = Object.entries(LEAGUE_LOGOS).find(([k]) =>
                a.leagueName.includes(k) || k.includes(a.leagueName.split(" ")[0])
              )?.[1]
              const score = a.homeScore !== null && a.awayScore !== null
                ? `${a.homeScore} - ${a.awayScore}`
                : "vs"

              return (
                <Link
                  key={a.slug}
                  href={`/stories/${a.slug}`}
                  className="block bg-turf/40 border border-turf-line/40 p-4 hover:bg-turf-line/20 hover:border-score-amber/40 transition-colors group"
                >
                  {/* 리그 정보 */}
                  <div className="flex items-center gap-1.5 mb-3">
                    {leagueLogo
                      ? <Logo src={leagueLogo} alt="" className="w-3.5 h-3.5" />
                      : <span className="w-3.5 h-3.5 rounded-full bg-turf-line inline-block" />
                    }
                    <span className="text-[10px] text-floodlight/50 font-medium uppercase tracking-wide">{a.leagueName}</span>
                    <span className="text-floodlight/20 text-[10px] ml-auto">
                      {new Date(a.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                  </div>

                  {/* 팀 엠블럼 + 스코어 */}
                  <div className="flex items-center gap-3 mb-3">
                    <TeamBadge name={a.homeTeam} logo={a.homeLogo} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-floodlight/90 truncate">{a.homeTeam}</span>
                        <span className="font-data font-bold text-score-amber text-base mx-3 shrink-0">{score}</span>
                        <span className="text-sm font-medium text-floodlight/90 truncate text-right">{a.awayTeam}</span>
                      </div>
                    </div>
                    <TeamBadge name={a.awayTeam} logo={a.awayLogo} />
                  </div>

                  {/* 한 줄 요약 */}
                  <p className="text-xs text-floodlight/50 leading-relaxed line-clamp-2 group-hover:text-floodlight/70 transition-colors">
                    {oneLiner(a)}
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
