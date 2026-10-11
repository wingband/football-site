"use client"

import { useState } from "react"
import type { DraftKind } from "@/lib/draftKinds"

// AI 초안을 최신 경기 데이터로 다시 쓴다 (같은 주소, 발행 전 초안만)
// 경기 리포트는 경기마다 따로 만들어지므로 다시 만들기 대상이 아니다.
export default function RegenerateDraftButton({ kind = "weekly" }: { kind?: Exclude<DraftKind, "report"> }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function run() {
    if (!confirm("초안을 최신 경기 데이터로 다시 쓸까요? 지금 화면에서 고친 내용은 사라져요.")) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/columns/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, refresh: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "다시 만들기에 실패했습니다")
        return
      }
      // 다시 쓰기는 같은 slug에 덮어쓰므로 같은 주소를 새로 불러온다
      window.location.reload()
    } finally {
      setLoading(false)
    }
  }

  return (
    <span className="inline-flex flex-col">
      <button onClick={run} disabled={loading} className="text-xs text-floodlight/50 underline underline-offset-2 hover:text-floodlight disabled:opacity-50">
        {loading ? "다시 쓰는 중… (30초 정도)" : "초안 다시 만들기"}
      </button>
      {error && <span className="text-[11px] text-red-400 mt-1">{error}</span>}
    </span>
  )
}
