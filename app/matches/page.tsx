import MatchesExplorer from "@/components/MatchesExplorer"
import DateTabs from "@/components/DateTabs"
import TransferWidget from "@/components/TransferWidget"
import LiveCommentsWidget from "@/components/LiveCommentsWidget"
import { getTodayStr } from "@/lib/dateUtils"
import { MOCK_FIXTURES } from "@/lib/mockData"
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

async function getFixturesByDate(date: string): Promise<Fixture[]> {
  if (process.env.USE_MOCK_DATA === "true") {
    return MOCK_FIXTURES
  }

  // 오늘 + 어제 경기를 같이 가져옴
  // 이유: PL 등 유럽 리그는 한국 기준 전날 밤 경기 → "오늘" 탭에서 안 보이는 문제 방지
  const yesterday = new Date(date + "T00:00:00")
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  const [todayRes, yesterdayRes] = await Promise.all([
    fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      next: { revalidate: 300 },
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

  const todayFixtures: Fixture[] = todayData.response ?? []
  const yesterdayFixtures: Fixture[] = yesterdayData.response ?? []

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

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const selectedDate = params.date || getTodayStr()
  const [fixtures, userCountry] = await Promise.all([
    getFixturesByDate(selectedDate),
    getUserCountry(),
  ])

  return (
    <main className="min-h-screen bg-pitch-night p-4 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* 사이트 공통 상단 배너는 layout.tsx에서 이미 렌더링됨 */}

        {/* 사이트 차별화 포인트: 한국인 해외파 선수 트래커 */}
        <KoreanAbroadWidget />

        <div>
          <DateTabs selectedDate={selectedDate} />
          <div className="flex gap-6 items-start mt-8">
            <div className="flex-1 min-w-0">
              <MatchesExplorer fixtures={fixtures} userCountry={userCountry ?? undefined} />
            </div>
            <aside className="w-72 shrink-0 hidden lg:block sticky top-20 space-y-6">
              <TransferWidget />
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