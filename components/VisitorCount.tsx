"use client"

import { useEffect, useState } from "react"
import { getTodayStr } from "@/lib/dateUtils"

// 같은 브라우저에서 하루 한 번만 카운트한다.
// 없으면 새로고침할 때마다 올라가서 "방문자 수"가 아니라 새로고침 횟수가 된다
const COUNTED_KEY = (date: string) => `football-site:pageview-counted:${date}`

export default function VisitorCount() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const today = getTodayStr()
    const key = COUNTED_KEY(today)

    let alreadyCounted = false
    try {
      alreadyCounted = localStorage.getItem(key) === "1"
    } catch {
      // 사파리 프라이빗 모드 등에서 localStorage가 막히면 그냥 카운트한다
    }

    // 요청을 보내기 "전에" 표시해둔다.
    // React 개발 모드는 effect를 두 번 실행하므로, 응답을 기다렸다 표시하면 두 번 카운트된다
    if (!alreadyCounted) {
      try {
        localStorage.setItem(key, "1")
      } catch {}
    }

    fetch("/api/pageview", { method: alreadyCounted ? "GET" : "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.count === "number") setCount(d.count)
      })
      .catch(() => {})
  }, [])

  // 아직 못 받았거나 DB 오류면 아무것도 그리지 않는다 (푸터에 깨진 값이 보이지 않게)
  if (count === null) return null

  return (
    <p className="text-[10px] text-floodlight/30">
      오늘 방문자 {count.toLocaleString("ko-KR")}명
    </p>
  )
}
