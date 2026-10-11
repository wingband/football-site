"use client"

import { useEffect } from "react"

// 칼럼 조회 1회 기록 — 같은 브라우저에서 같은 날 다시 열면 세지 않는다
export default function ColumnViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `cv:${slug}:${new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" })}`
    try {
      if (localStorage.getItem(key)) return
      localStorage.setItem(key, "1")
    } catch {
      // 저장소를 못 쓰는 브라우저도 한 번은 센다
    }
    fetch("/api/columns/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
      keepalive: true,
    }).catch(() => {})
  }, [slug])
  return null
}
