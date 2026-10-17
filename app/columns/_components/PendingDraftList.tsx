"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

type Item = { slug: string; title: string; kindLabel: string }

// 관리자 전용: 총평을 기다리는 초안 목록 — 개별 삭제 / 전체 삭제 (비공개 초안만 담긴다)
export default function PendingDraftList({ items }: { items: Item[] }) {
  const router = useRouter()
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")

  const list = items.filter((i) => !removed.has(i.slug))

  async function del(slug: string) {
    const res = await fetch(`/api/columns/${encodeURIComponent(slug)}`, { method: "DELETE" })
    if (!res.ok) throw new Error("삭제하지 못했어요")
    setRemoved((p) => new Set(p).add(slug))
  }

  async function one(it: Item) {
    if (busy || !window.confirm(`이 초안을 삭제할까요?\n\n${it.title}`)) return
    setBusy(it.slug)
    setError("")
    try {
      await del(it.slug)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패")
    } finally {
      setBusy(null)
    }
  }

  async function all() {
    if (busy || list.length === 0) return
    if (!window.confirm(`초안 ${list.length}개를 모두 삭제할까요? 되돌릴 수 없어요.`)) return
    setBusy("all")
    setError("")
    try {
      for (const it of list) await del(it.slug)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패")
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  if (list.length === 0) return <p className="text-sm text-floodlight/60">남은 초안이 없어요.</p>

  return (
    <>
      <ul className="space-y-2">
        {list.map((d) => (
          <li key={d.slug} className="flex items-center gap-2">
            <Link href={`/columns/write?slug=${d.slug}`} className="flex items-baseline gap-2 group min-w-0 flex-1">
              <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-score-amber/20 text-score-amber">{d.kindLabel}</span>
              <span className="text-sm text-floodlight/85 group-hover:text-score-amber line-clamp-1">{d.title}</span>
            </Link>
            <button
              type="button"
              onClick={() => one(d)}
              disabled={busy !== null}
              className="shrink-0 text-xs px-2.5 py-1 border border-turf-line text-floodlight/60 hover:text-red-400 hover:border-red-400/60 transition-colors disabled:opacity-40"
            >
              {busy === d.slug ? "삭제 중…" : "삭제"}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-3">
        {list.length > 1 && (
          <button
            type="button"
            onClick={all}
            disabled={busy !== null}
            className="text-xs px-3 py-1.5 border border-red-400/50 text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
          >
            {busy === "all" ? "삭제 중…" : `초안 ${list.length}개 전체 삭제`}
          </button>
        )}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </>
  )
}
