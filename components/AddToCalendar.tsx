"use client"

import { useState } from "react"

// "내 캘린더에 저장" (2026-10-12). GoalLine 서버에는 아무것도 저장되지 않고,
// 누른 사람의 구글 캘린더 / 휴대폰·PC 캘린더 앱에만 일정(경기 30분 전 알림 포함)이 들어간다.
const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")

export default function AddToCalendar({ title, startIso, id, compact = false }: { title: string; startIso: string; id: string; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const start = new Date(startIso)
  const end = new Date(start.getTime() + 2 * 3600_000)

  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent("GoalLine에서 저장한 경기 일정 (https://www.goalline.me)")}`

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GoalLine//KO",
    "BEGIN:VEVENT",
    `UID:${id}@goalline.me`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${title}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${title}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
  const icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`

  return (
    <div className="relative shrink-0" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="내 캘린더에 저장"
        aria-label="내 캘린더에 저장"
        className={`text-xs sm:text-sm rounded-full border border-score-amber/60 text-score-amber hover:bg-score-amber/10 whitespace-nowrap ${compact ? "w-9 h-9 flex items-center justify-center" : "px-3 py-1.5"}`}
      >
        {compact ? "📅" : "📅 내 캘린더에 저장 ▾"}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-30 w-64 bg-pitch-night border border-turf-line rounded-none shadow-xl p-1.5 text-sm">
          <a href={google} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-floodlight hover:bg-turf-line/40">
            구글 캘린더에 저장
          </a>
          <a href={icsHref} download={`goalline-${id}.ics`} onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-floodlight hover:bg-turf-line/40">
            아이폰·갤럭시·PC 캘린더에 저장
            <span className="block text-[11px] text-floodlight/55">.ics 파일 — 열면 내 캘린더 앱에 들어가요</span>
          </a>
          <p className="px-3 py-2 text-[11px] leading-4 text-floodlight/55 border-t border-turf-line/60 mt-1">
            내 캘린더에만 저장되고, 경기 30분 전에 알림이 와요. GoalLine에는 아무것도 저장되지 않아요.
          </p>
        </div>
      )}
    </div>
  )
}
