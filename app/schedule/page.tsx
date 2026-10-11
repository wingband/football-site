import type { Metadata } from "next"
import ScheduleCalendar from "@/components/ScheduleCalendar"
import { getMonthSchedule, normalizeMonth, shiftMonth, SCHEDULE_LEAGUES } from "@/lib/schedule"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "축구 경기 일정 달력 - 해외파 · 프리미어리그 · 챔피언스리그 · K리그",
  description:
    "손흥민·이강인·김민재 등 해외파 경기와 프리미어리그, 라리가, 분데스리가, 세리에A, 리그1, 챔피언스리그, K리그1 일정을 한 달 달력으로 한눈에 확인하세요. 한국 시간 기준.",
  alternates: { canonical: "/schedule" },
}

// 오늘(한국 시간) YYYY-MM-DD
function todayKst() {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: raw } = await searchParams
  const month = normalizeMonth(raw)
  const current = normalizeMonth(undefined)
  const matches = await getMonthSchedule(month)

  const today = todayKst()

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
 <h1 className="text-xl sr-only">축구 경기 일정 달력</h1>
      <ScheduleCalendar
        month={month}
        today={today}
        prevMonth={month > shiftMonth(current, -2) ? shiftMonth(month, -1) : null}
        nextMonth={month < shiftMonth(current, 2) ? shiftMonth(month, 1) : null}
        isCurrentMonth={month === current}
        leagues={SCHEDULE_LEAGUES.map((l) => ({ id: l.id, label: l.label }))}
        matches={matches}
      />
    </main>
  )
}
