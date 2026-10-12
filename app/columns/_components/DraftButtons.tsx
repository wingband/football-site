"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DRAFT_KINDS, type DraftKind } from "@/lib/draftKinds"

// 관리자 전용: 초안 종류별로 "지금 만들기" (보통은 크론이 알아서 만든다)
const ORDER: DraftKind[] = ["weekly", "weekend", "kleague", "report", "club"]

export default function DraftButtons() {
  const router = useRouter()
  const [loading, setLoading] = useState<DraftKind | null>(null)
  const [msg, setMsg] = useState("")

  async function run(kind: DraftKind) {
    setLoading(kind)
    setMsg("")
    try {
      const res = await fetch("/api/columns/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(data.error ?? "초안 생성에 실패했습니다")
        return
      }
      if ((kind === "report" || kind === "club") && data.slugs?.length > 1) {
        setMsg(`경기 리포트 초안 ${data.slugs.length}개를 만들었어요`)
        router.refresh()
        return
      }
      router.push(`/columns/write?slug=${data.slug}`)
    } catch {
      setMsg("초안 생성에 실패했습니다")
    } finally {
      setLoading(null)
    }
  }

  return (
    <details className="text-sm">
      <summary className="cursor-pointer px-4 py-2 border border-score-amber/60 text-score-amber rounded hover:bg-score-amber/10 list-none">
        초안 지금 만들기 ▾
      </summary>
      <div className="mt-2 flex flex-col gap-1.5 items-stretch">
        {ORDER.map((k) => (
          <button
            key={k}
            onClick={() => run(k)}
            disabled={loading !== null}
            className="text-xs px-3 py-1.5 border border-turf-line text-floodlight/80 rounded hover:border-score-amber hover:text-score-amber disabled:opacity-50 text-left"
          >
            {loading === k ? "만드는 중… (30초~1분)" : DRAFT_KINDS[k].label}
          </button>
        ))}
        {msg && <p className="text-xs text-floodlight/70 max-w-56">{msg}</p>}
      </div>
    </details>
  )
}
