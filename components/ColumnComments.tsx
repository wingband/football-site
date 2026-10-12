"use client"

import { useEffect, useState } from "react"
import { useUser, SignInButton } from "@clerk/nextjs"

type Comment = { id: number; userId: string; nickname: string; content: string; createdAt: string }

function when(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return "방금"
  if (m < 60) return `${m}분 전`
  if (m < 60 * 24) return `${Math.floor(m / 60)}시간 전`
  return new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" })
}

// 칼럼 댓글: 박스 없이 구분선으로만. 로그인한 사람만 쓰고, 본인 댓글(관리자는 전부)은 삭제 가능.
export default function ColumnComments({ slug, admin }: { slug: string; admin: boolean }) {
  const { isSignedIn, user } = useUser()
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let alive = true
    fetch(`/api/columns/comments?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => alive && setComments(d.comments ?? []))
      .catch(() => alive && setComments([]))
    return () => {
      alive = false
    }
  }, [slug])

  async function submit() {
    const content = text.trim()
    if (!content || busy) return
    setBusy(true)
    setError("")
    try {
      const res = await fetch("/api/columns/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, content }),
      })
      const d = await res.json()
      if (!res.ok) {
        setError(d.error ?? "오류가 발생했어요")
        return
      }
      setComments((prev) => [...(prev ?? []), d.comment])
      setText("")
    } catch {
      setError("네트워크 오류가 발생했어요")
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: number) {
    if (!window.confirm("이 댓글을 삭제할까요?")) return
    const res = await fetch(`/api/columns/comments?id=${id}`, { method: "DELETE" })
    if (res.ok) setComments((prev) => (prev ?? []).filter((c) => c.id !== id))
  }

  return (
    <section className="pt-8 pb-10 border-t border-turf-line/40" aria-label="댓글">
      <h2 className="text-lg font-bold text-floodlight mb-1">
        댓글 <span className="font-data text-score-amber">{comments?.length ?? 0}</span>
      </h2>

      {comments && comments.length > 0 && (
        <ul className="divide-y divide-turf-line/30 mb-6">
          {comments.map((c) => (
            <li key={c.id} className="py-3.5">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-floodlight/90">{c.nickname}</span>
                <span className="text-xs text-floodlight/40">{when(c.createdAt)}</span>
                {(admin || (user && user.id === c.userId)) && (
                  <button type="button" onClick={() => remove(c.id)} className="ml-auto text-xs text-floodlight/40 hover:text-red-400 transition-colors">
                    삭제
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-floodlight/80 whitespace-pre-wrap break-words break-keep">{c.content}</p>
            </li>
          ))}
        </ul>
      )}
      {comments && comments.length === 0 && <p className="text-sm text-floodlight/50 py-4">첫 댓글을 남겨보세요. 경기를 본 이야기도 좋아요!</p>}

      {isSignedIn ? (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="이 경기에 대한 생각을 남겨보세요 (500자)"
            className="w-full resize-y bg-turf/30 border border-turf-line px-3 py-2.5 text-sm text-floodlight placeholder:text-floodlight/35 focus:outline-none focus:border-score-amber"
          />
          <div className="mt-2 flex items-center gap-3">
            <span className="text-xs text-floodlight/40">욕설·광고·도배 댓글은 삭제될 수 있어요</span>
            {error && <span className="text-xs text-red-400">{error}</span>}
            <span className="ml-auto text-xs font-data text-floodlight/40">{text.length}/500</span>
            <button
              type="button"
              onClick={submit}
              disabled={busy || !text.trim()}
              className="shrink-0 text-sm px-5 py-2 bg-score-amber text-pitch-night font-bold rounded-full hover:bg-floodlight transition-colors disabled:opacity-40"
            >
              {busy ? "등록 중…" : "댓글 등록"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 py-2">
          <p className="text-sm text-floodlight/60">댓글을 남기려면 로그인이 필요해요</p>
          <SignInButton mode="modal">
            <button type="button" className="text-sm px-4 py-2 bg-score-amber text-pitch-night font-bold rounded-full hover:bg-floodlight transition-colors">
              로그인하고 댓글 달기
            </button>
          </SignInButton>
        </div>
      )}
    </section>
  )
}
