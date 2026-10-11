"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState, useMemo } from "react"
import type { Article } from "@/lib/articles"
import Logo from "@/components/Logo"
import { teamKo, leagueKo } from "@/lib/koreanNames"
import { withJosa } from "@/lib/josa"

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

// 한 줄 요약 생성 (팀·리그 이름은 한글로)
function oneLiner(a: Article): string {
  const home = teamKo(a.homeTeam)
  const away = teamKo(a.awayTeam)
  const league = leagueKo(a.leagueName)
  if (a.homeScore !== null && a.awayScore !== null) {
    const score = `${a.homeScore}-${a.awayScore}`
    const winner = a.homeScore > a.awayScore ? home : a.awayScore > a.homeScore ? away : null
    if (winner) return `${withJosa(winner, "이", "가")} ${score}로 승리한 ${league} 경기입니다.`
    return `${home} ${score} ${away} — 두 팀이 팽팽하게 맞선 ${league} 경기입니다.`
  }
  return `${home} vs ${away} ${league} 경기 리뷰입니다.`
}

function shortDate(iso: string) {
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000)
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`
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
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-floodlight">
      <section className="bg-turf/40 border border-turf-line/60 rounded-2xl p-4 sm:p-5">
 <h1 className="text-xl font-display text-floodlight">경기 리뷰</h1>
        <p className="text-sm text-floodlight/75 mt-2">주요 경기 분석 · {articles.length}개</p>

        {/* 리그 탭 필터 */}
        <div className="flex gap-1.5 overflow-x-auto pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* 전체 탭 */}
          <button
            onClick={() => setActiveTab("전체")}
            className={`shrink-0 px-3 py-1.5 rounded-full border text-xs sm:text-sm transition-colors ${
              activeTab === "전체"
                ? "bg-score-amber text-pitch-night border-score-amber font-bold"
                : "border-turf-line text-floodlight/75 hover:text-floodlight hover:border-floodlight/40"
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
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs sm:text-sm transition-colors ${
                  activeTab === tab.label
                    ? "bg-score-amber text-pitch-night border-score-amber font-bold"
                    : "border-turf-line text-floodlight/75 hover:text-floodlight hover:border-floodlight/40"
                }`}
              >
                <Logo src={tab.logo} alt="" className="w-4 h-4" />
                {leagueKo(tab.label)}
                <span className="opacity-60">({count})</span>
              </button>
            )
          })}

          {/* 그 외 탭 */}
          {hasOther && (
            <button
              onClick={() => setActiveTab("그 외")}
              className={`shrink-0 px-3 py-1.5 rounded-full border text-xs sm:text-sm transition-colors ${
                activeTab === "그 외"
                  ? "bg-score-amber text-pitch-night border-score-amber font-bold"
                  : "border-turf-line text-floodlight/75 hover:text-floodlight hover:border-floodlight/40"
              }`}
            >
              그 외
            </button>
          )}
        </div>

      </section>

      {/* 기사 목록 */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-turf/30 border border-turf-line/40 animate-pulse h-36 rounded-2xl" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <p className="text-floodlight/60 text-sm py-8 text-center">해당 리그 리뷰가 없습니다.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {displayed.map((a) => {
            const leagueLogo = Object.entries(LEAGUE_LOGOS).find(([k]) =>
              a.leagueName.includes(k) || k.includes(a.leagueName.split(" ")[0])
            )?.[1]
            const hasScore = a.homeScore !== null && a.awayScore !== null

            return (
              <Link
                key={a.slug}
                href={`/stories/${a.slug}`}
                className="group block bg-turf/40 border border-turf-line/60 rounded-2xl p-4 sm:p-5 hover:border-score-amber/60 transition-colors"
              >
                {/* 리그 · 날짜 */}
                <div className="flex items-center gap-2 mb-3">
                  {leagueLogo ? <Logo src={leagueLogo} alt="" className="w-5 h-5" /> : <span className="w-5 h-5 rounded-full bg-turf-line inline-block" />}
                  <span className="text-sm font-semibold text-floodlight/90">{leagueKo(a.leagueName)}</span>
                  <span className="text-xs text-floodlight/65 ml-auto">{shortDate(a.createdAt)}</span>
                </div>

                {/* 팀 엠블럼 + 스코어 */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="flex items-center justify-end gap-2.5 min-w-0">
                    <span className="text-sm font-semibold text-floodlight text-right leading-snug">{teamKo(a.homeTeam)}</span>
                    <TeamBadge name={a.homeTeam} logo={a.homeLogo} size="lg" />
                  </div>
                  <span className="font-data font-bold text-score-amber text-xl px-1">
                    {hasScore ? `${a.homeScore} : ${a.awayScore}` : "vs"}
                  </span>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <TeamBadge name={a.awayTeam} logo={a.awayLogo} size="lg" />
                    <span className="text-sm font-semibold text-floodlight leading-snug">{teamKo(a.awayTeam)}</span>
                  </div>
                </div>

                {/* 한 줄 요약 */}
                <p className="mt-3 text-sm text-floodlight/80 leading-relaxed">{oneLiner(a)}</p>
                <p className="mt-2 text-sm font-semibold text-score-amber">리뷰 보기 →</p>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
