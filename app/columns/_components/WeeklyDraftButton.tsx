"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

// 관리자 전용: 이번 주 해외파 칼럼 초안을 바로 만들고 편집 화면으로 이동
export default function WeeklyDraftButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function run() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/columns/generate-weekly", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "초안 생성에 실패했습니다")
        return
      }
      router.push(`/columns/write?slug=${data.slug}`)
    } catch {
      setError("초안 생성에 실패했습니다")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={run}
        disabled={loading}
        className="text-sm px-4 py-2 border border-score-amber/60 text-score-amber rounded hover:bg-score-amber/10 transition-colors disabled:opacity-50"
      >
        {loading ? "초안 만드는 중… (30초 정도)" : "이번 주 해외파 초안 만들기"}
      </button>
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  )
}
