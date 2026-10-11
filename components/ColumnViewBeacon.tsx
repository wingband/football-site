"use client"

import { useEffect } from "react"

// 칼럼 조회 1회 기록 — 같은 브라우저에서 같은 날 다시 열면 세지 않는다
export default function ColumnViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    // 내 브라우저는 세지 않기: ?nocount=1 로 한 번 열어두거나, 관리자 로그인 상태로 열면 이 기기에 표시가 남는다
    try {
      if (new URLSearchParams(location.search).get("nocount") === "1") localStorage.setItem("gl-nocount", "1")
      if (localStorage.getItem("gl-nocount")) return
    } catch {}
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
    })
      .then((r) => r.json())
      .then((j) => {
        if (j?.admin) {
          try {
            localStorage.setItem("gl-nocount", "1")
          } catch {}
        }
      })
      .catch(() => {})
  }, [slug])
  return null
}
