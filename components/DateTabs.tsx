"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatDateLabel, getTodayStr, shiftDate, getMonthGrid } from "@/lib/dateUtils"

const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"]

export default function DateTabs({ selectedDate }: { selectedDate: string }) {
  const router = useRouter()
  const today = getTodayStr()
  const prevDate = shiftDate(selectedDate, -1)
  const nextDate = shiftDate(selectedDate, 1)

  const [calendarOpen, setCalendarOpen] = useState(false)
  const selected = new Date(selectedDate + "T00:00:00")
  const [viewYear, setViewYear] = useState(selected.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected.getMonth())

  function openCalendar() {
    setViewYear(selected.getFullYear())
    setViewMonth(selected.getMonth())
    setCalendarOpen(true)
  }

  function goToDate(dateStr: string) {
    setCalendarOpen(false)
    router.push(`/matches?date=${dateStr}`)
  }

  function shiftMonth(n: number) {
    const d = new Date(viewYear, viewMonth + n, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  const grid = getMonthGrid(viewYear, viewMonth)

  return (
    <div className="relative flex justify-center">
      <div className="flex items-center justify-center gap-6 bg-turf/40 border border-turf-line/60 rounded-full px-4 py-2.5 max-w-xs w-full">
        <button
          onClick={() => router.push(`/matches?date=${prevDate}`)}
          className="text-floodlight/50 hover:text-score-amber transition-colors px-2"
          aria-label="이전 날짜"
        >
          ‹
        </button>

        <button
          onClick={() => (calendarOpen ? setCalendarOpen(false) : openCalendar())}
          className="font-display uppercase text-sm text-score-amber tracking-wide min-w-16 text-center flex items-center gap-1.5 justify-center"
        >
          {formatDateLabel(selectedDate, today)}
          <span className={`text-[10px] transition-transform ${calendarOpen ? "rotate-180" : ""}`}>▼</span>
        </button>

        <button
          onClick={() => router.push(`/matches?date=${nextDate}`)}
          className="text-floodlight/50 hover:text-score-amber transition-colors px-2"
          aria-label="다음 날짜"
        >
          ›
        </button>
      </div>

      {calendarOpen && (
        <>
          {/* 바깥을 클릭하면 닫히도록 하는 투명 배경 */}
          <div className="fixed inset-0 z-40" onClick={() => setCalendarOpen(false)} />

          <div className="absolute top-full mt-2 z-50 bg-turf border border-turf-line rounded-xl p-4 shadow-xl w-72">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => shiftMonth(-1)}
                className="text-floodlight/50 hover:text-score-amber px-2"
                aria-label="이전 달"
              >
                ‹
              </button>
              <span className="font-display text-sm text-floodlight">
                {viewYear}년 {viewMonth + 1}월
              </span>
              <button
                onClick={() => shiftMonth(1)}
                className="text-floodlight/50 hover:text-score-amber px-2"
                aria-label="다음 달"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-floodlight/40 mb-1">
              {WEEKDAYS_KO.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {grid.map((cell) => {
                const isSelected = cell.dateStr === selectedDate
                const isToday = cell.dateStr === today
                const dayNum = Number(cell.dateStr.split("-")[2])
                return (
                  <button
                    key={cell.dateStr}
                    onClick={() => goToDate(cell.dateStr)}
                    className={`text-xs py-1.5 rounded-full transition-colors ${
                      !cell.inMonth
                        ? "text-floodlight/15"
                        : isSelected
                        ? "bg-score-amber text-pitch-night font-medium"
                        : isToday
                        ? "border border-score-amber text-score-amber"
                        : "text-floodlight/70 hover:bg-turf-line/60"
                    }`}
                  >
                    {dayNum}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}