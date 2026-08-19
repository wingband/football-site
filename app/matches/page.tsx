import MatchesExplorer from "@/components/MatchesExplorer"
import DateTabs from "@/components/DateTabs"
import TransferWidget from "@/components/TransferWidget"
import { getTodayStr } from "@/lib/dateUtils"
import { MOCK_FIXTURES } from "@/lib/mockData"
import AdSlot from "@/components/AdSlot"
import KoreanAbroadWidget from "@/components/KoreanAbroadWidget"
import type { Metadata } from "next"

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

async function getFixturesByDate(date: string): Promise<Fixture[]> {
  if (process.env.USE_MOCK_DATA === "true") {
    return MOCK_FIXTURES
  }

  const res = await fetch(
    `https://v3.football.api-sports.io/fixtures?date=${date}`,
    {
      headers: {
        "x-apisports-key": process.env.API_FOOTBALL_KEY!,
      },
      next: { revalidate: 3600 },
    }
  )

  const data = await res.json()
  return data.response
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const params = await searchParams
  const selectedDate = params.date || getTodayStr()
  const fixtures = await getFixturesByDate(selectedDate)

  return (
    <main className="min-h-screen bg-pitch-night p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 상단 배너 광고 자리 */}
        <AdSlot label="상단 배너 광고 (예: 728x90)" className="w-full h-16" />

        {/* 사이트 차별화 포인트: 한국인 해외파 선수 트래커 */}
        <KoreanAbroadWidget />

        <div>
          <DateTabs selectedDate={selectedDate} />
          <div className="flex gap-6 items-start mt-8">
            <div className="flex-1 min-w-0">
              <MatchesExplorer fixtures={fixtures} />
            </div>
            <aside className="w-72 shrink-0 hidden lg:block sticky top-20 space-y-6">
              <TransferWidget />
              {/* 사이드바 광고 자리 */}
              <AdSlot label="사이드바 광고 (예: 300x250)" className="w-full h-64" />
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}