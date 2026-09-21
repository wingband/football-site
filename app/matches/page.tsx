import MatchesExplorer from "@/components/MatchesExplorer"
import DateTabs from "@/components/DateTabs"
import TransferWidget from "@/components/TransferWidget"
import LiveCommentsWidget from "@/components/LiveCommentsWidget"
import GlobalChatWidget from "@/components/GlobalChatWidget"
import { getTodayStr, shiftDate, formatDateLabel } from "@/lib/dateUtils"
import { MOCK_FIXTURES } from "@/lib/mockData"
import { saveCachedFixtures, getCachedFixtures } from "@/lib/fixturesCache"
import AdSlot from "@/components/AdSlot"
import KoreanAbroadWidget from "@/components/KoreanAbroadWidget"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { revalidateTag } from "next/cache"
import { fetchApiFootball, ApiFootballError } from "@/lib/apiFootballClient"

type Fixture = {
  fixture: {
    id: number
    date: string
    status: { long: string; short: string; elapsed: number | null }
  }
  teams: {
    home: { name: string; logo: string }
    away: { name: string; logo: string }
  }
  goals: {
    home: number | null
    away: number | null
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
  }
}

// Vercel은 X-Vercel-IP-Country 헤더로 클라이언트 국가 코드를 자동 주입함
async function getUserCountry(): Promise<string | null> {
  try {
    const h = await headers()
    return h.get("x-vercel-ip-country") ?? null
  } catch {
    return null
  }
}

type FixturesResult = {
  fixtures: Fixture[]
  // DB 캐시에서 꺼내온 데이터인지 (화면 상단 안내 표시용)
  fromCache: boolean
  cachedAt: Date | null
}

// 관심 리그만 노출한다. 이걸 안 걸러두면 전세계 모든 리그(카자흐스탄, 아르메니아
// 등)의 팀/경기 링크가 화면에 그대로 걸려서, 크롤러가 그 링크를 따라가며 안 볼
// 팀/경기 페이지를 계속 새로 발견해 API 호출을 늘리는 원인이 된다
const RELEVANT_LEAGUE_IDS = new Set([
  39,  // Premier League
  140, // La Liga
  78,  // Bundesliga
  135, // Serie A
  61,  // Ligue 1
  2,   // UEFA Champions League
  3,   // UEFA Europa League
  848, // UEFA Conference League
  292, // K League 1
  98,  // J1 League
])

// 국가대표 경기는 리그 하나로 안 잡힌다 (대륙별 예선이 리그 ID가 다 다름).
// 팀 이름으로 잡는 게 더 안전해서, 축구 강호 국가대표팀 이름을 직접 나열한다
const MAJOR_NATIONAL_TEAMS = new Set([
  "South Korea",
  "Brazil",
  "Argentina",
  "England",
  "France",
  "Germany",
  "Spain",
  "Portugal",
  "Netherlands",
  "Italy",
  "Belgium",
  "Japan",
  "Croatia",
])

function isRelevantFixture(fx: Fixture): boolean {
  return (
    RELEVANT_LEAGUE_IDS.has(fx.league.id) ||
    MAJOR_NATIONAL_TEAMS.has(fx.teams.home.name) ||
    MAJOR_NATIONAL_TEAMS.has(fx.teams.away.name)
  )
}

async function fetchFixturesFromApi(date: string): Promise<Fixture[] | null> {
  // 오늘 + 어제 경기를 같이 가져옴
  // 이유: PL 등 유럽 리그는 한국 기준 전날 밤 경기 → "오늘" 탭에서 안 보이는 문제 방지
  const yesterday = new Date(date + "T00:00:00")
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  // 오늘/어제 화살표나 날짜 드롭다운으로 과거 날짜를 볼 때도 30분~1시간짜리
  // 짧은 캐시가 그대로 적용돼서, 몇 달 전 날짜를 봐도 API가 계속 재호출되고
  // 있었다. 조회하는 날짜가 오늘이 아니면(=과거, 이미 다 끝난 경기) 24시간으로
  // 늘린다. 오늘 날짜 자체만 라이브 스코어를 위해 기존처럼 짧게 유지한다
  const isToday = date === getTodayStr()
  const dateRevalidate = isToday ? 1800 : 86400
  const yesterdayRevalidate = isToday ? 3600 : 86400

  // (2026-09-20) 실제 fetch/에러판별/재시도 로직은 lib/apiFootballClient.ts로
  // 통합했다. 태그는 여전히 여기서 관리한다 — 실패 시 revalidateTag로 그 캐시
  // 항목만 즉시 무효화해서, 과거 날짜(24시간 캐시)가 순간적 흐림 한 번으로
  // 다음 날까지 박제되는 걸 막는다 (2026-09-19~20, Ultra 플랜 반영 직후
  // 과도기에 "어제" 탭이 정확히 이렇게 24시간 박제됨 확인).
  const todayTag = `fixtures-${date}`
  const yesterdayTag = `fixtures-${yesterdayStr}`

  let todayFixtures: Fixture[]
  try {
    todayFixtures = await fetchApiFootball(`/fixtures?date=${date}`, {
      revalidate: dateRevalidate,
      tags: [todayTag],
    }) as Fixture[]
  } catch (err) {
    console.error(
      "경기 목록 API 실패:",
      err instanceof ApiFootballError ? err.message : err
    )
    revalidateTag(todayTag, { expire: 0 })
    return null
  }

  let yesterdayFixtures: Fixture[] = []
  try {
    yesterdayFixtures = await fetchApiFootball(`/fixtures?date=${yesterdayStr}`, {
      revalidate: yesterdayRevalidate,
      tags: [yesterdayTag],
    }) as Fixture[]
  } catch (err) {
    console.error(
      "어제 경기 목록 API 실패(보조 데이터, 빈 배열로 진행):",
      err instanceof ApiFootballError ? err.message : err
    )
    revalidateTag(yesterdayTag, { expire: 0 })
  }

  console.log(`=== 경기 목록: today=${date}, yesterday=${yesterdayStr} ===`)
  console.log("today count:", todayFixtures.length, "yesterday count:", yesterdayFixtures.length)

  // 어제 경기 중 주요 리그만 포함 (전체 가져오면 너무 많아짐)
  const MAJOR_LEAGUE_IDS = new Set([
    39,  // Premier League
    40,  // Championship
    2,   // Champions League
    3,   // Europa League
    140, // La Liga
    78,  // Bundesliga
    135, // Serie A
    61,  // Ligue 1
    45,  // FA Cup
    292, // K League 1
    98,  // J1 League
    848, // Conference League
  ])
  const FINISHED = ["FT", "AET", "PEN", "AWD", "WO"]
  const finishedYesterday = yesterdayFixtures.filter(
    (f) =>
      FINISHED.includes(f.fixture.status.short) &&
      MAJOR_LEAGUE_IDS.has(f.league.id)
  )

  // 중복 제거 후 합치기 (오늘 + 어제 종료 경기)
  const seen = new Set<number>()
  const merged: Fixture[] = []
  for (const f of [...todayFixtures, ...finishedYesterday]) {
    if (!seen.has(f.fixture.id)) {
      seen.add(f.fixture.id)
      merged.push(f)
    }
  }

  return merged
}

async function getFixturesByDate(date: string): Promise<FixturesResult> {
  if (process.env.USE_MOCK_DATA === "true") {
    return { fixtures: MOCK_FIXTURES.filter(isRelevantFixture), fromCache: false, cachedAt: null }
  }

  let fixtures: Fixture[] | null = null
  try {
    fixtures = await fetchFixturesFromApi(date)
  } catch (err) {
    // 네트워크 오류 등으로 fetch 자체가 던진 경우도 캐시 폴백 대상
    console.error("경기 목록 API 호출 실패:", err)
    fixtures = null
  }

  // 성공했으면 관심 리그/국가대표만 추려서 저장 (전세계 리그를 다 저장하면
  // DB 용량도 아깝고, 폴백 시에도 어차피 안 보여줄 데이터라 의미 없음)
  if (fixtures && fixtures.length > 0) {
    const relevant = fixtures.filter(isRelevantFixture)
    await saveCachedFixtures(date, relevant)
    return { fixtures: relevant, fromCache: false, cachedAt: null }
  }

  // 실패(null) 또는 빈 응답 → 마지막으로 성공한 데이터로 폴백
  const cached = await getCachedFixtures<Fixture>(date)
  if (cached) {
    console.log(`경기 목록 DB 캐시 사용 (date=${date}, updated_at=${cached.updatedAt?.toISOString()})`)
    // 이 필터가 배포되기 전에 저장된 예전 캐시 항목은 전세계 리그가 다 들어있을
    // 수 있어서, 폴백 시에도 한 번 더 걸러준다
    return { fixtures: cached.data.filter(isRelevantFixture), fromCache: true, cachedAt: cached.updatedAt }
  }

  // 캐시도 없으면 빈 목록 (그 날짜에 정말 경기가 없는 경우도 여기로 옴)
  return { fixtures: fixtures ?? [], fromCache: false, cachedAt: null }
}

// 선택한 날짜에 경기가 하나도 없을 때(비시즌, 국가대표 주간 등) 화면을 텅 비우는
// 대신 최근에 경기가 있었던 날짜를 찾아 보여준다. 하루씩 API를 새로 호출하면
// 쿼터를 불필요하게 소모하니, 여기서는 이미 저장돼있는 DB 캐시만 뒤진다 —
// cron prefill이 못 채운 아주 오래된 날짜는 못 찾을 수 있는데, 그 경우엔
// 기존처럼(못 찾으면) 빈 목록으로 남는다.
const FALLBACK_SEARCH_DAYS = 14

async function findFallbackFixtures(
  fromDate: string
): Promise<{ date: string; fixtures: Fixture[] } | null> {
  let candidate = fromDate
  for (let i = 0; i < FALLBACK_SEARCH_DAYS; i++) {
    candidate = shiftDate(candidate, -1)
    const cached = await getCachedFixtures<Fixture>(candidate)
    if (cached && cached.data.length > 0) {
      return { date: candidate, fixtures: cached.data.filter(isRelevantFixture) }
    }
  }
  return null
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const selectedDate = params.date || getTodayStr()
  const [{ fixtures, fromCache, cachedAt }, userCountry] = await Promise.all([
    getFixturesByDate(selectedDate),
    getUserCountry(),
  ])

  // 선택한 날짜에 경기가 없으면 최근 경기가 있었던 날짜로 자동 대체
  let effectiveDate = selectedDate
  let effectiveFixtures = fixtures
  let fallbackFromDate: string | null = null

  if (fixtures.length === 0) {
    const fallback = await findFallbackFixtures(selectedDate)
    if (fallback) {
      effectiveDate = fallback.date
      effectiveFixtures = fallback.fixtures
      fallbackFromDate = selectedDate
    }
  }

  // 캐시 시점은 한국 시간으로 보여줌 (서버 타임존과 무관하게 고정)
  const cachedAtText = cachedAt
    ? new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(cachedAt)
    : null

  const today = getTodayStr()

  return (
    <main className="min-h-screen bg-pitch-night p-4 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* 사이트 공통 상단 배너는 layout.tsx에서 이미 렌더링됨 */}

        {/* 사이트 차별화 포인트: 한국인 해외파 선수 트래커 */}
        <KoreanAbroadWidget />

        {/* API 실패로 DB에 저장된 마지막 성공 데이터를 쓰는 중일 때만 노출 */}
        {fromCache && (
          <div className="border border-score-amber/50 bg-score-amber/10 px-4 py-3 flex items-start gap-2.5">
            <span className="text-score-amber text-sm leading-5">⚠</span>
            <div className="min-w-0">
              <p className="text-sm text-score-amber font-semibold">
                일시적으로 캐시된 데이터입니다
              </p>
              <p className="text-xs text-floodlight/60 mt-0.5">
                실시간 경기 정보를 불러오지 못해 마지막으로 저장된 정보를 보여주고 있습니다.
                {cachedAtText && ` (기준 시각: ${cachedAtText})`}
              </p>
            </div>
          </div>
        )}

        {/* 선택한 날짜에 경기가 없어 최근 경기로 대체 표시 중일 때만 노출 */}
        {fallbackFromDate && (
          <div className="border border-turf-line bg-turf/40 px-4 py-3 flex items-start gap-2.5">
            <span className="text-floodlight/50 text-sm leading-5">ℹ</span>
            <p className="text-sm text-floodlight/70">
              {formatDateLabel(fallbackFromDate, today)}은 예정된 경기가 없어, 가장 최근 경기가
              있었던 {formatDateLabel(effectiveDate, today)} 일정을 보여드립니다.
            </p>
          </div>
        )}

        <div>
          <DateTabs selectedDate={effectiveDate} />
          <div className="flex gap-6 items-start mt-8">
            <div className="flex-1 min-w-0">
              <MatchesExplorer fixtures={effectiveFixtures} userCountry={userCountry ?? undefined} />
            </div>
            <aside className="w-72 shrink-0 hidden lg:block sticky top-20 space-y-6">
              <TransferWidget />
              <GlobalChatWidget />
              <LiveCommentsWidget />
              {/* 사이드바 광고 자리 */}
              <AdSlot label="사이드바 광고 (예: 300x250)" className="w-full h-64" />
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}
