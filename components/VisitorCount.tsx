"use client"

import { useEffect, useState } from "react"
import { getTodayStr } from "@/lib/dateUtils"

// 같은 브라우저에서 하루 한 번만 카운트한다.
// 없으면 새로고침할 때마다 올라가서 "방문자 수"가 아니라 새로고침 횟수가 된다
const COUNTED_KEY = (date: string) => `football-site:pageview-counted:${date}`

// (2026-11-25) 페이지를 여는 것만으로는 세지 않는다 — 일반 브라우저인 척하는 수집 봇이
// 페이지마다 새 브라우저로 들어와 하루 130명씩 찍혔다(같은 날 GA는 2~4명).
// 터치·스크롤·키 입력 같은 "사람의 첫 조작"이 일어났을 때 한 번 센다.
// 페이지가 열린 것 자체는 서버에 기록만 남긴다(app/api/pageview/route.ts).
const HUMAN_EVENTS = ["pointerdown", "touchstart", "keydown", "wheel", "scroll"] as const

export default function VisitorCount() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const today = getTodayStr()
    const key = COUNTED_KEY(today)
    const show = (d: { count?: unknown }) => {
      if (typeof d?.count === "number") setCount(d.count)
    }

    let alreadyCounted = false
    try {
      alreadyCounted = localStorage.getItem(key) === "1"
    } catch {
      // 사파리 프라이빗 모드 등에서 localStorage가 막히면 그냥 카운트한다
    }

    if (alreadyCounted) {
      fetch("/api/pageview").then((r) => r.json()).then(show).catch(() => {})
      return
    }

    // 자동화 도구로 조종되는 브라우저는 스스로 표시를 달고 있다
    const automated = navigator.webdriver === true
    const post = (phase: "load" | "human", source?: string | null) =>
      fetch("/api/pageview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase, automated, ...(source ? { source } : {}) }),
      })
        .then((r) => r.json())
        .then(show)
        .catch(() => {})

    post("load")

    let done = false
    const onHuman = () => {
      if (done) return
      done = true
      cleanup()
      // 요청을 보내기 "전에" 표시해둔다 (중복 카운트 방지)
      try {
        localStorage.setItem(key, "1")
      } catch {}
      // 커뮤니티 홍보 링크(?utm_source=fmkorea 등)로 들어왔으면 채널별 통계에도 반영
      post("human", new URLSearchParams(window.location.search).get("utm_source"))
    }
    const cleanup = () => {
      for (const ev of HUMAN_EVENTS) window.removeEventListener(ev, onHuman)
    }
    for (const ev of HUMAN_EVENTS) window.addEventListener(ev, onHuman, { passive: true })
    return cleanup
  }, [])

  // 아직 못 받았거나 DB 오류면 아무것도 그리지 않는다 (푸터에 깨진 값이 보이지 않게)
  if (count === null) return null

  return (
    <p className="text-xs text-floodlight/30">
      오늘 방문자 {count.toLocaleString("ko-KR")}명
    </p>
  )
}
