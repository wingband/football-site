import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/siteConfig"
import { matchHref } from "@/lib/slug"
import { getTodayStr, shiftDate } from "@/lib/dateUtils"
import { MOCK_FIXTURES } from "@/lib/mockData"
import { getMatchIdsWithArticles } from "@/lib/articles"
import { getColumns } from "@/lib/columns"
import { KOREAN_PLAYERS_ABROAD } from "@/lib/koreanPlayersAbroad"
import { fetchApiFootball } from "@/lib/apiFootballClient"
import { devErrorOrSilent } from "@/lib/quietLog"

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
  { id: 848, name: "UEFA Europa Conference League" },
  { id: 292, name: "K League 1" },
  { id: 98,  name: "J1 League" },
]

const SITEMAP_LEAGUE_IDS = new Set(SITEMAP_LEAGUES.map((l) => l.id))

// 국가대표 경기는 대륙별 예선마다 리그 ID가 달라서 리그 목록으로는 못 잡는다.
// /matches 페이지 필터와 동일한 팀 이름 목록을 그대로 쓴다
const MAJOR_NATIONAL_TEAMS = new Set([
  "South Korea", "Brazil", "Argentina", "England", "France", "Germany",
  "Spain", "Portugal", "Netherlands", "Italy", "Belgium", "Japan", "Croatia",
])

const FINISHED_CODES = ["FT", "AET", "PEN", "AWD", "WO"]

type SitemapFixture = {
  fixture: { id: number; date: string; status: { short: string } }
  teams: {
    home: { id?: number; name: string }
    away: { id?: number; name: string }
  }
  league: { id: number }
}

// (2026-09-20) 기존엔 res.ok만 확인하고 errors 필드를 체크하지 않아서, API
// 레이트리밋 시 "이 날짜엔 경기 없음"으로 오인해 revalidate(하루) 동안 그 날짜의
// 모든 경기가 사이트맵/색인에서 조용히 빠질 수 있었다. fetchApiFootball()로 교체.
// 사이트맵은 절대 500이 되면 안 되므로(크롤러가 아무것도 못 읽게 됨), 이 함수
// 자체에서 실패를 잡아 빈 배열로 폴백한다 — 그 날짜만 스킵되고 나머지는 정상 동작.
async function getFixturesByDate(date: string): Promise<SitemapFixture[]> {
  try {
    const response = await fetchApiFootball(`/fixtures?date=${date}`, { revalidate: 86400 })
    return response as SitemapFixture[]
  } catch (err) {
    devErrorOrSilent(`사이트맵: ${date} 경기 목록 조회 실패:`, err instanceof Error ? err.message : err)
    return []
  }
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
    const isRelevantLeague = SITEMAP_LEAGUE_IDS.has(f.league?.id)
    const isNationalTeamMatch =
      MAJOR_NATIONAL_TEAMS.has(f.teams.home.name) || MAJOR_NATIONAL_TEAMS.has(f.teams.away.name)
    if (!isRelevantLeague && !isNationalTeamMatch) return false
    if (seen.has(f.fixture.id)) return false
    seen.add(f.fixture.id)
    return true
  })
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  // 사이트맵이 1시간마다 재생성되는데 lastModified를 매번 now로 찍으면,
  // 실제로는 안 바뀐 팀/리그/비교 페이지도 구글한테 "방금 바뀌었다"고 매시간
  // 알리는 꼴이 돼서 불필요한 재크롤을 유발한다. 날짜 단위로 끊어서
  // 하루에 한 번만 값이 바뀌게 한다 (실제로 hourly인 홈/경기 목록 페이지는 now 그대로 사용)
  const dailyStamp = new Date(now.toISOString().slice(0, 10))

  // 항상 존재하는 페이지. /search는 쿼리 기반이라 색인 가치가 없어서 제외 (robots에서도 차단)
  const staticRoutes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    // "/"는 /matches로 영구 이동하는 주소라 사이트맵에서 뺀다 (이동하는 주소를 넣으면 색인 경고)
    { path: "/matches",         priority: 1,   changeFrequency: "hourly" },
    { path: "/columns",         priority: 0.9, changeFrequency: "daily" },
    { path: "/stories",         priority: 0.9, changeFrequency: "hourly" },
    { path: "/standings",       priority: 0.8, changeFrequency: "daily" },
    { path: "/korean-players",  priority: 0.8, changeFrequency: "daily" },
    { path: "/transfers",       priority: 0.7, changeFrequency: "daily" },
    { path: "/news",            priority: 0.7, changeFrequency: "hourly" },
    { path: "/best11",          priority: 0.6, changeFrequency: "weekly" },
    { path: "/compare",         priority: 0.6, changeFrequency: "weekly" },
    { path: "/company",         priority: 0.3, changeFrequency: "yearly" },
    { path: "/privacy",         priority: 0.3, changeFrequency: "yearly" },
  ]

  // (2026-10-10) 애드센스 "가치가 별로 없는 콘텐츠" 거절 대응.
  // 예전엔 오늘/어제 주요 경기 전부 + 그 경기 참가 팀 페이지 + 해외파 비교 조합(78개)을
  // 다 넣었는데, 대부분이 API 데이터만 있는 얇은 페이지였다. 이제는
  //   - 경기: 리뷰 글이 있는 경기만 (리뷰 없는 경기 페이지는 noindex 처리됨)
  //   - 팀/비교 페이지: 제외 (noindex 처리됨)
  //   - 칼럼(직접 쓴 글)과 해외파 선수 페이지 추가
  const fixtures = await getSitemapFixtures()

  let reviewedIds = new Set<number>()
  try {
    reviewedIds = await getMatchIdsWithArticles(fixtures.map((f) => f.fixture.id))
  } catch (err) {
    devErrorOrSilent("사이트맵: 리뷰 경기 조회 실패:", err instanceof Error ? err.message : err)
  }

  const matchEntries: MetadataRoute.Sitemap = fixtures
    .filter((fx) => reviewedIds.has(fx.fixture.id))
    .map((fx) => {
      const finished = FINISHED_CODES.includes(fx.fixture.status?.short ?? "")
      return {
        url: `${SITE_URL}${matchHref(fx)}`,
        lastModified: new Date(fx.fixture.date),
        changeFrequency: finished ? "weekly" : "hourly",
        priority: 0.7,
      }
    })

  const leagueEntries: MetadataRoute.Sitemap = SITEMAP_LEAGUES.map((league) => ({
    url: `${SITE_URL}/leagues/${league.id}`,
    lastModified: dailyStamp,
    changeFrequency: "daily",
    priority: 0.6,
  }))

  // 사이트의 차별점인 한국인 해외파 선수 페이지 (이 선수들만 색인 유지)
  const koreanPlayerEntries: MetadataRoute.Sitemap = KOREAN_PLAYERS_ABROAD.map((p) => ({
    url: `${SITE_URL}/players/${p.id}`,
    lastModified: dailyStamp,
    changeFrequency: "daily",
    priority: 0.6,
  }))

  // 사이트 고유 콘텐츠인 칼럼. 가장 높은 우선순위
  let columnEntries: MetadataRoute.Sitemap = []
  try {
    const columns = await getColumns()
    columnEntries = columns.map((c) => ({
      url: `${SITE_URL}/columns/${c.slug}`,
      lastModified: new Date(c.updatedAt),
      changeFrequency: "weekly",
      priority: 0.9,
    }))
  } catch (err) {
    devErrorOrSilent("사이트맵: 칼럼 목록 조회 실패:", err instanceof Error ? err.message : err)
  }

  return [
    ...staticRoutes.map(({ path, priority, changeFrequency }) => ({
      url: `${SITE_URL}${path}`,
      // hourly인 페이지(홈/경기 목록/스토리)만 now, 나머지(daily 이하)는 dailyStamp
      lastModified: changeFrequency === "hourly" ? now : dailyStamp,
      changeFrequency,
      priority,
    })),
    ...columnEntries,
    ...matchEntries,
    ...leagueEntries,
    ...koreanPlayerEntries,
  ]
}
