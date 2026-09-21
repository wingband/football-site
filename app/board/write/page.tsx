"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser, SignInButton } from "@clerk/nextjs"

export default function BoardWritePage() {
  const { isSignedIn, isLoaded, user } = useUser()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function submit() {
    if (!title.trim() || !content.trim()) {
      setError("제목과 내용을 모두 입력해주세요")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const nickname =
        user?.username ?? user?.firstName ?? user?.emailAddresses[0]?.emailAddress?.split("@")[0] ?? "익명"
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, nickname }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "글 등록에 실패했습니다")
        return
      }
      router.push(`/board/${data.id}`)
    } catch {
      setError("글 등록에 실패했습니다")
    } finally {
      setSubmitting(false)
    }
  }

  if (!isLoaded) return null

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight font-sans flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-floodlight/50 mb-4">글을 쓰려면 로그인이 필요합니다</p>
          <SignInButton mode="modal">
            <button className="text-sm px-6 py-2.5 bg-score-amber text-pitch-night font-bold rounded hover:bg-score-amber/80 transition-colors">
              로그인하기
            </button>
          </SignInButton>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-display uppercase text-xl text-score-amber mb-6">글쓰기</h1>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          maxLength={100}
          className="w-full bg-turf/40 border border-turf-line rounded px-4 py-2.5 text-sm text-floodlight placeholder:text-floodlight/30 focus:outline-none focus:border-score-amber transition-colors"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요"
          rows={12}
          maxLength={5000}
          className="w-full mt-3 bg-turf/40 border border-turf-line rounded px-4 py-2.5 text-sm text-floodlight placeholder:text-floodlight/30 focus:outline-none focus:border-score-amber transition-colors resize-none"
        />
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={submit}
            disabled={submitting}
            className="text-sm px-6 py-2.5 bg-score-amber text-pitch-night font-bold rounded hover:bg-score-amber/80 transition-colors disabled:opacity-50"
          >
            {submitting ? "등록 중..." : "등록"}
          </button>
        </div>
      </div>
    </main>
  )
}
