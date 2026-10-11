"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatDateLabel, getTodayStr, shiftDate, getMonthGrid } from "@/lib/dateUtils"

const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"]

type Props = {
  selectedDate: string | null // null = 날짜 선택 안 함(전체)
  basePath?: string
  onSelect?: (date: string | null) => void // 있으면 페이지 이동 대신 이 콜백 사용 (리뷰 페이지 등)
  marked?: string[] // 데이터가 있는 날짜(YYYY-MM-DD). 점 표시 + 화살표가 이 날짜들 사이를 이동
}

export default function DateTabs({ selectedDate: selectedProp, basePath = "/matches", onSelect, marked }: Props) {
  const selectedDate = selectedProp ?? getTodayStr()
  const router = useRouter()
  const today = getTodayStr()
  const sortedMarked = marked ? [...marked].sort() : null
  const prevDate = sortedMarked
    ? [...sortedMarked].reverse().find((d) => d < selectedDate) ?? null
    : shiftDate(selectedDate, -1)
  const nextDate = sortedMarked
    ? sortedMarked.find((d) => d > selectedDate) ?? null
    : shiftDate(selectedDate, 1)
  const markedSet = new Set(marked ?? [])
  const go = (d: string | null) => {
    if (!d) return
    if (onSelect) onSelect(d)
    else router.push(`${basePath}?date=${d}`)
  }

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
    go(dateStr)
  }

  function shiftMonth(n: number) {
    const d = new Date(viewYear, viewMonth + n, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  const grid = getMonthGrid(viewYear, viewMonth)

  return (
    <div className="relative flex justify-center">
      <div className="flex items-center justify-center gap-4 bg-turf/40 border border-turf-line/60 rounded-none px-3 py-2 max-w-xs w-full">
        <button
          onClick={() => go(prevDate)}
          disabled={!prevDate}
          className="text-floodlight/60 hover:text-score-amber disabled:opacity-30 disabled:hover:text-floodlight/60 transition-colors px-2 text-base"
          aria-label="이전 날짜"
        >
          ‹
        </button>

        <button
          onClick={() => (calendarOpen ? setCalendarOpen(false) : openCalendar())}
          className="text-sm font-semibold text-score-amber min-w-24 text-center flex items-center gap-1.5 justify-center"
        >
          {selectedProp === null ? "전체 날짜" : formatDateLabel(selectedDate, today)}
          <span className={`text-xs transition-transform ${calendarOpen ? "rotate-180" : ""}`}>▼</span>
        </button>

        <button
          onClick={() => go(nextDate)}
          disabled={!nextDate}
          className="text-floodlight/60 hover:text-score-amber disabled:opacity-30 disabled:hover:text-floodlight/60 transition-colors px-2 text-base"
          aria-label="다음 날짜"
        >
          ›
        </button>
      </div>

      {calendarOpen && (
        <>
          {/* 바깥을 클릭하면 닫히도록 하는 투명 배경 */}
          <div className="fixed inset-0 z-40" onClick={() => setCalendarOpen(false)} />

          <div className="absolute top-full mt-2 z-50 bg-pitch-night border border-turf-line rounded-none p-4 shadow-xl w-72">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => shiftMonth(-1)}
                className="text-floodlight/50 hover:text-score-amber px-2"
                aria-label="이전 달"
              >
                ‹
              </button>
              <span className="text-sm font-semibold text-floodlight">
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

            <div className="grid grid-cols-7 gap-1 text-center text-xs text-floodlight/40 mb-1">
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
                    className={`relative text-xs py-1.5 rounded-none transition-colors ${
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
                    {markedSet.has(cell.dateStr) && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-score-amber" />
                    )}
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