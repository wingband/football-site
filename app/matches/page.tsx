import MatchesExplorer from "@/components/MatchesExplorer"
import DateTabs from "@/components/DateTabs"
import TransferWidget from "@/components/TransferWidget"
import LiveCommentsWidget from "@/components/LiveCommentsWidget"
import GlobalChatWidget from "@/components/GlobalChatWidget"
import { getTodayStr } from "@/lib/dateUtils"
import { MOCK_FIXTURES } from "@/lib/mockData"
import { saveCachedFixtures, getCachedFixtures } from "@/lib/fixturesCache"
import AdSlot from "@/components/AdSlot"
import KoreanAbroadWidget from "@/components/KoreanAbroadWidget"
import type { Metadata } from "next"
import { headers } from "next/headers"

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

// API-Football 응답이 "쓸 수 있는" 응답인지 판단.
// 레이트리밋/키 오류일 때 API가 200 + errors 필드로 응답하는 경우가 있어서 status만 봐선 부족함
function hasApiError(data: { errors?: unknown }): boolean {
  const e = data?.errors
  if (!e) return false
  if (Array.isArray(e)) return e.length > 0
  if (typeof e === "object") return Object.keys(e as object).length > 0
  return true
}

type FixturesResult = {
  fixtures: Fixture[]
  // DB 캐시에서 꺼내온 데이터인지 (화면 상단 안내 표시용)
  fromCache: boolean
  cachedAt: Date | null
}

async function fetchFixturesFromApi(date: string): Promise<Fixture[] | null> {
  // 오늘 + 어제 경기를 같이 가져옴
  // 이유: PL 등 유럽 리그는 한국 기준 전날 밤 경기 → "오늘" 탭에서 안 보이는 문제 방지
  const yesterday = new Date(date + "T00:00:00")
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  const [todayRes, yesterdayRes] = await Promise.all([
    fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      // 5분(300s)이면 방문자 수와 무관하게 하루 최대 288번씩 재호출돼서
      // 일일 쿼터를 순식간에 다 먹는다. 30분으로 늘려서 호출 빈도를 낮춘다
      next: { revalidate: 1800 },
    }),
    fetch(`https://v3.football.api-sports.io/fixtures?date=${yesterdayStr}`, {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      next: { revalidate: 3600 },
    }),
  ])

  const [todayData, yesterdayData] = await Promise.all([
    todayRes.json(),
    yesterdayRes.json(),
  ])

  console.log(`=== 경기 목록: today=${date}, yesterday=${yesterdayStr} ===`)
  console.log("today results:", todayData.results, "yesterday results:", yesterdayData.results)

  // 선택된 날짜 호출이 실패했으면 캐시로 폴백해야 하므로 null을 돌려준다.
  // 어제 호출은 보조 데이터라서 실패해도 그냥 빈 배열로 진행
  if (!todayRes.ok || hasApiError(todayData)) {
    console.error("경기 목록 API 실패:", todayRes.status, todayData?.errors)
    return null
  }

  const todayFixtures: Fixture[] = todayData.response ?? []
  const yesterdayFixtures: Fixture[] =
    yesterdayRes.ok && !hasApiError(yesterdayData) ? yesterdayData.response ?? [] : []

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
    4,   // Conference League
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
    return { fixtures: MOCK_FIXTURES, fromCache: false, cachedAt: null }
  }

  let fixtures: Fixture[] | null = null
  try {
    fixtures = await fetchFixturesFromApi(date)
  } catch (err) {
    // 네트워크 오류 등으로 fetch 자체가 던진 경우도 캐시 폴백 대상
    console.error("경기 목록 API 호출 실패:", err)
    fixtures = null
  }

  // 성공했으면 다음 실패를 위해 저장해두고 그대로 사용
  if (fixtures && fixtures.length > 0) {
    await saveCachedFixtures(date, fixtures)
    return { fixtures, fromCache: false, cachedAt: null }
  }

  // 실패(null) 또는 빈 응답 → 마지막으로 성공한 데이터로 폴백
  const cached = await getCachedFixtures<Fixture>(date)
  if (cached) {
    console.log(`경기 목록 DB 캐시 사용 (date=${date}, updated_at=${cached.updatedAt?.toISOString()})`)
    return { fixtures: cached.data, fromCache: true, cachedAt: cached.updatedAt }
  }

  // 캐시도 없으면 빈 목록 (그 날짜에 정말 경기가 없는 경우도 여기로 옴)
  return { fixtures: fixtures ?? [], fromCache: false, cachedAt: null }
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

        <div>
          <DateTabs selectedDate={selectedDate} />
          <div className="flex gap-6 items-start mt-8">
            <div className="flex-1 min-w-0">
              <MatchesExplorer fixtures={fixtures} userCountry={userCountry ?? undefined} />
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