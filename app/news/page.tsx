import type { Metadata } from "next"
import AdSlot from "@/components/AdSlot"
import Link from "next/link"
import Logo from "@/components/Logo"
import { fetchNewsData } from "@/lib/newsData"

export const metadata: Metadata = {
  title: "축구 뉴스 — GoalLine",
  description: "프리미어리그, 챔피언스리그, 라리가 등 전 세계 축구 최신 뉴스",
}

type Article = {
  title: string
  link: string
  image_url: string | null
  pubDate: string
  source_name: string
  description: string | null
}

// 리그별 검색 키워드
const LEAGUE_SECTIONS = [
  { id: "pl",       label: "Premier League",   logo: "/leagues/pl.png",         query: '"Premier League"' },
  { id: "cl",       label: "Champions League", logo: "/leagues/cl.png",         query: '"Champions League"' },
  { id: "laliga",   label: "La Liga",          logo: "/leagues/laliga.png",     query: '"La Liga"' },
  { id: "bundesliga", label: "Bundesliga",     logo: "/leagues/bundesliga.png", query: '"Bundesliga"' },
]

// (2026-09-21) fetchNewsData()로 통합 — DB 캐시(6시간) 적용으로 API 소진 절감.
// 뉴스 홈은 이 사이트에서 NewsData.io를 가장 많이 부르는 페이지(리그 4개 + 종합
// 쿼리, 방문마다 5번)라 캐싱 부재의 영향이 가장 컸을 곳이다.
async function fetchNews(query: string, size = 8): Promise<Article[]> {
  return fetchNewsData(encodeURIComponent(query), { size })
}

async function fetchTopNews(): Promise<Article[]> {
  return fetchNews("soccer OR football transfer", 10)
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (h < 1) return "방금 전"
  if (h < 24) return `${h}시간 전`
  if (d < 7) return `${d}일 전`
  return `지난주`
}

// 히어로 + 트렌딩 (최상단)
function HeroSection({ articles }: { articles: Article[] }) {
  const hero = articles[0]
  const trending = articles.slice(1, 6)
  if (!hero) return null

  return (
    <div className="grid lg:grid-cols-[1fr_400px] gap-6 mb-10">
      {/* 히어로 */}
      <a href={hero.link} target="_blank" rel="noopener noreferrer"
        className="relative block overflow-hidden group">
        {hero.image_url ? (
          <div className="relative aspect-[16/9] overflow-hidden">
            <img src={hero.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="text-white font-bold text-xl leading-snug line-clamp-3">{hero.title}</p>
              <p className="text-white/60 text-xs mt-2">{hero.source_name} · {timeAgo(hero.pubDate)}</p>
            </div>
          </div>
        ) : (
          <div className="bg-turf/60 p-6 h-full min-h-[240px] flex flex-col justify-end">
            <p className="text-floodlight font-bold text-xl leading-snug">{hero.title}</p>
            <p className="text-floodlight/50 text-xs mt-2">{hero.source_name} · {timeAgo(hero.pubDate)}</p>
          </div>
        )}
      </a>

      {/* 트렌딩 */}
      <div className="bg-turf/30 border border-turf-line/40">
        <p className="text-sm font-semibold px-4 py-3 border-b border-turf-line/40 text-floodlight/80">트렌딩</p>
        <div className="divide-y divide-turf-line/20">
          {trending.map((a, i) => (
            <a key={i} href={a.link} target="_blank" rel="noopener noreferrer"
              className="flex gap-3 items-start px-4 py-3 hover:bg-turf-line/20 transition-colors group">
              <span className="text-score-amber font-bold font-data text-lg w-6 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-floodlight/90 leading-snug line-clamp-2 group-hover:text-score-amber transition-colors">{a.title}</p>
                <p className="text-[10px] text-floodlight/40 mt-1">{a.source_name} · {timeAgo(a.pubDate)}</p>
              </div>
              {a.image_url && (
                <img src={a.image_url} alt="" className="w-16 h-12 object-cover shrink-0" />
              )}
            </a>
          ))}
        </div>
        <a href="#" className="block text-center text-xs text-score-amber hover:underline py-3 border-t border-turf-line/30">
          더 보기 ↗
        </a>
      </div>
    </div>
  )
}

// 리그별 섹션
function LeagueSection({ label, logo, articles }: { label: string; logo: string; articles: Article[] }) {
  if (articles.length === 0) return null

  const hero = articles.find(a => a.image_url) ?? articles[0]
  const list = articles.filter(a => a !== hero).slice(0, 4)

  return (
    <div className="bg-turf/20 border border-turf-line/30 overflow-hidden mb-6">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-turf-line/30">
        <Logo src={logo} alt="" className="w-6 h-6" />
        <h2 className="font-display uppercase text-sm text-floodlight/90 font-bold tracking-wide">{label}</h2>
      </div>

      <div className="grid lg:grid-cols-[1fr_480px]">
        {/* 좌: 기사 리스트 */}
        <div className="divide-y divide-turf-line/20 border-r border-turf-line/20">
          {list.map((a, i) => (
            <a key={i} href={a.link} target="_blank" rel="noopener noreferrer"
              className="flex gap-3 items-start px-5 py-4 hover:bg-turf-line/20 transition-colors group">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-floodlight/90 leading-snug line-clamp-2 group-hover:text-score-amber transition-colors font-medium">{a.title}</p>
                <p className="text-[10px] text-floodlight/40 mt-1.5">{a.source_name} · {timeAgo(a.pubDate)}</p>
              </div>
              {a.image_url && (
                <img src={a.image_url} alt="" className="w-20 h-14 object-cover shrink-0" />
              )}
            </a>
          ))}
          <a href="#" className="block px-5 py-3 text-xs text-score-amber hover:underline">
            더 보기 ↗
          </a>
        </div>

        {/* 우: 히어로 기사 */}
        {hero && (
          <a href={hero.link} target="_blank" rel="noopener noreferrer" className="relative block group overflow-hidden min-h-[280px]">
            {hero.image_url ? (
              <>
                <img src={hero.image_url} alt="" className="w-full h-full object-cover absolute inset-0 group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-white font-bold text-lg leading-snug line-clamp-3">{hero.title}</p>
                  <p className="text-white/60 text-xs mt-2">{hero.source_name} · {timeAgo(hero.pubDate)}</p>
                </div>
              </>
            ) : (
              <div className="bg-score-amber/10 p-6 h-full flex flex-col justify-end min-h-[280px]">
                <p className="text-floodlight font-bold text-lg leading-snug">{hero.title}</p>
                <p className="text-floodlight/50 text-xs mt-2">{hero.source_name} · {timeAgo(hero.pubDate)}</p>
              </div>
            )}
          </a>
        )}
      </div>
    </div>
  )
}

// (2026-09-21) NewsData.io 크레딧 소진(ApiLimitExceeded) 등으로 API 호출이
// 전부 실패하면 topNews/leagueNews가 모두 빈 배열이 되어, HeroSection과
// LeagueSection이 각자 null을 반환하면서 페이지 제목만 남고 본문이 완전히
// 텅 비어버리는 문제가 있었다. AdSense 심사 시 "빈 페이지"보다 "깨진 기능"으로
// 더 부정적으로 비칠 수 있어, 완전 실패 상황을 감지해 명확한 안내 문구를 보여준다.
function EmptyNewsState() {
  return (
    <div className="bg-turf/20 border border-turf-line/30 py-16 px-6 text-center">
      <p className="text-floodlight/60 text-sm mb-1">지금은 뉴스를 불러올 수 없습니다.</p>
      <p className="text-floodlight/30 text-xs">잠시 후 다시 방문해 주세요.</p>
    </div>
  )
}

export default async function NewsPage() {
  // 상단 종합 + 리그별 뉴스 병렬 로드
  const [topNews, ...leagueNews] = await Promise.all([
    fetchTopNews(),
    ...LEAGUE_SECTIONS.map(s => fetchNews(s.query)),
  ])

  const hasAnyNews = topNews.length > 0 || leagueNews.some((a) => a.length > 0)

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <div className="pt-8 pb-4">
          <h1 className="font-display uppercase text-xl text-score-amber">뉴스</h1>
        </div>

        <AdSlot label="뉴스 페이지 배너 광고 (예: 728x90)" className="w-full h-16 mb-8" />

        {hasAnyNews ? (
          <>
            {/* 히어로 + 트렌딩 */}
            <HeroSection articles={topNews} />

            {/* 리그별 섹션 */}
            {LEAGUE_SECTIONS.map((section, i) => (
              <LeagueSection
                key={section.id}
                label={section.label}
                logo={section.logo}
                articles={leagueNews[i] ?? []}
              />
            ))}
          </>
        ) : (
          <EmptyNewsState />
        )}
      </div>
    </main>
  )
}
