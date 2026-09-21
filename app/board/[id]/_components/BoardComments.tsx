"use client"

import { useState, useEffect } from "react"
import { useUser, SignInButton } from "@clerk/nextjs"

type Comment = {
  id: number
  userId: string
  nickname: string
  content: string
  createdAt: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  if (m < 1) return "방금"
  if (m < 60) return `${m}분 전`
  if (h < 24) return `${h}시간 전`
  return new Date(dateStr).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })
}

export default function BoardComments({ postId }: { postId: number }) {
  const { isSignedIn, user } = useUser()
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/board/${postId}/comments`)
      .then((r) => r.json())
      .then((data) => setComments(data.comments ?? []))
  }, [postId])

  async function submit() {
    if (!content.trim()) return
    setSubmitting(true)
    try {
      const nickname =
        user?.username ?? user?.firstName ?? user?.emailAddresses[0]?.emailAddress?.split("@")[0] ?? "익명"
      const res = await fetch(`/api/board/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, nickname }),
      })
      if (res.ok) {
        setComments((prev) => [
          ...prev,
          {
            id: Date.now(),
            userId: user?.id ?? "",
            nickname,
            content,
            createdAt: new Date().toISOString(),
          },
        ])
        setContent("")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-6 bg-turf/30 border border-turf-line/40 rounded p-4">
      <p className="text-sm font-semibold text-floodlight mb-3">💬 댓글 {comments.length}개</p>

      <div className="space-y-3 mb-4">
        {comments.length === 0 ? (
          <p className="text-xs text-floodlight/30 py-4 text-center">첫 댓글을 남겨보세요!</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="text-xs">
              <span className="font-medium text-floodlight/80">{c.nickname}</span>
              <span className="text-floodlight/30 ml-2">{timeAgo(c.createdAt)}</span>
              <p className="text-floodlight/70 mt-0.5 whitespace-pre-wrap">{c.content}</p>
            </div>
          ))
        )}
      </div>

      {isSignedIn ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="댓글을 입력하세요"
            maxLength={1000}
            className="flex-1 bg-pitch-night border border-turf-line rounded px-3 py-2 text-xs text-floodlight placeholder:text-floodlight/30 focus:outline-none focus:border-score-amber transition-colors"
          />
          <button
            onClick={submit}
            disabled={submitting}
            className="text-xs px-4 py-2 bg-score-amber text-pitch-night font-bold rounded hover:bg-score-amber/80 transition-colors disabled:opacity-50 shrink-0"
          >
            등록
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-floodlight/40">댓글을 남기려면 로그인이 필요합니다</p>
          <SignInButton mode="modal">
            <button className="w-full text-xs px-4 py-2 bg-score-amber text-pitch-night font-bold rounded hover:bg-score-amber/80 transition-colors whitespace-nowrap">
              로그인하고 댓글 달기
            </button>
          </SignInButton>
        </div>
      )}
    </div>
  )
}
