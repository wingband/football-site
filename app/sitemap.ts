import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/siteConfig"
import { matchHref } from "@/lib/slug"
import { getTodayStr, shiftDate } from "@/lib/dateUtils"
import { MOCK_FIXTURES } from "@/lib/mockData"

// 사이트맵은 기본적으로 캐시되는 라우트 핸들러라서, 경기 목록이 하루 종일 굳지 않도록
// 1시간마다 다시 만든다
export const revalidate = 3600

// 사이트맵에 경기를 넣을 리그. 나머지 리그는 경기 수가 너무 많고 검색 유입도 거의 없어서 제외
const SITEMAP_LEAGUES = [
  { id: 39,  name: "Premier League" },
  { id: 140, name: "La Liga" },
  { id: 78,  name: "Bundesliga" },
  { id: 135, name: "Serie A" },
  { id: 61,  name: "Ligue 1" },
  { id: 2,   name: "UEFA Champions League" },
  { id: 3,   name: "UEFA Europa League" },
  { id: 292, name: "K League 1" },
]

const SITEMAP_LEAGUE_IDS = new Set(SITEMAP_LEAGUES.map((l) => l.id))
const FINISHED_CODES = ["FT", "AET", "PEN", "AWD", "WO"]

type SitemapFixture = {
  fixture: { id: number; date: string; status: { short: string } }
  teams: {
    home: { id?: number; name: string }
    away: { id?: number; name: string }
  }
  league: { id: number }
}

async function getFixturesByDate(date: string): Promise<SitemapFixture[]> {
  const res = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
    next: { revalidate: 3600 },
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data.response) ? data.response : []
}

// 오늘 + 어제(한국 시간 기준) 경기를 날짜별로 한 번씩만 호출해서 가져온다.
// 리그별로 따로 호출하면 8배로 늘어나니까, 날짜로 받아서 주요 리그만 걸러내는 쪽이 쿼터에 유리함.
// 어제까지 넣는 이유: 유럽 리그는 한국 기준 전날 밤에 끝나서 종료 직후 색인이 가장 중요함
async function getSitemapFixtures(): Promise<SitemapFixture[]> {
  if (process.env.USE_MOCK_DATA === "true") {
    return MOCK_FIXTURES
  }

  const today = getTodayStr()
  const yesterday = shiftDate(today, -1)

  // API가 죽어도 사이트맵 자체는 200으로 나가야 한다 (500이면 크롤러가 아무것도 못 읽음)
  let fixtures: SitemapFixture[]
  try {
    const [todayFixtures, yesterdayFixtures] = await Promise.all([
      getFixturesByDate(today),
      getFixturesByDate(yesterday),
    ])
    fixtures = [...todayFixtures, ...yesterdayFixtures]
  } catch (err) {
    console.error("사이트맵 경기 목록 로드 실패:", err)
    return []
  }

  const seen = new Set<number>()
  return fixtures.filter((f) => {
    if (!SITEMAP_LEAGUE_IDS.has(f.league?.id)) return false
    if (seen.has(f.fixture.id)) return false
    seen.add(f.fixture.id)
    return true
  })
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // 항상 존재하는 페이지. /search는 쿼리 기반이라 색인 가치가 없어서 제외 (robots에서도 차단)
  const staticRoutes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "",                 priority: 1,   changeFrequency: "hourly" },
    { path: "/matches",         priority: 1,   changeFrequency: "hourly" },
    { path: "/stories",         priority: 0.9, changeFrequency: "hourly" },
    { path: "/standings",       priority: 0.8, changeFrequency: "daily" },
    { path: "/korean-players",  priority: 0.8, changeFrequency: "daily" },
    { path: "/transfers",       priority: 0.7, changeFrequency: "daily" },
    { path: "/news",            priority: 0.7, changeFrequency: "hourly" },
    { path: "/best11",          priority: 0.6, changeFrequency: "weekly" },
    { path: "/privacy",         priority: 0.3, changeFrequency: "yearly" },
  ]

  const fixtures = await getSitemapFixtures()

  const matchEntries: MetadataRoute.Sitemap = fixtures.map((fx) => {
    const finished = FINISHED_CODES.includes(fx.fixture.status?.short ?? "")
    return {
      url: `${SITE_URL}${matchHref(fx)}`,
      lastModified: new Date(fx.fixture.date),
      // 종료된 경기는 더 이상 안 바뀌고, 진행 전/중인 경기는 스코어가 계속 바뀜
      changeFrequency: finished ? "weekly" : "hourly",
      priority: 0.8,
    }
  })

  const leagueEntries: MetadataRoute.Sitemap = SITEMAP_LEAGUES.map((league) => ({
    url: `${SITE_URL}/leagues/${league.id}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }))

  // 팀 페이지는 위에서 가져온 경기의 참가 팀에서 뽑는다 (추가 API 호출 없음)
  const teamIds = new Set<number>()
  for (const fx of fixtures) {
    if (fx.teams.home.id) teamIds.add(fx.teams.home.id)
    if (fx.teams.away.id) teamIds.add(fx.teams.away.id)
  }

  const teamEntries: MetadataRoute.Sitemap = [...teamIds].map((teamId) => ({
    url: `${SITE_URL}/teams/${teamId}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.6,
  }))

  return [
    ...staticRoutes.map(({ path, priority, changeFrequency }) => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    })),
    ...matchEntries,
    ...leagueEntries,
    ...teamEntries,
  ]
}
