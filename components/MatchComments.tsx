"use client"

import { useState, useEffect, useRef } from "react"

type Comment = {
  id: number
  match_id: number
  nickname: string
  content: string
  created_at: string
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

export default function MatchComments({
  matchId,
  homeTeam,
  awayTeam,
}: {
  matchId: number
  homeTeam: string
  awayTeam: string
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [nickname, setNickname] = useState("")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  // 저장된 닉네임 불러오기
  useEffect(() => {
    const saved = localStorage.getItem("goalline_nickname")
    if (saved) setNickname(saved)
  }, [])

  // 댓글 로드
  useEffect(() => {
    fetch(`/api/comments?matchId=${matchId}`)
      .then(r => r.json())
      .then(d => setComments(d.comments ?? []))
      .catch(() => {})

    // 30초마다 새 댓글 체크
    const interval = setInterval(() => {
      fetch(`/api/comments?matchId=${matchId}`)
        .then(r => r.json())
        .then(d => setComments(d.comments ?? []))
        .catch(() => {})
    }, 30000)

    return () => clearInterval(interval)
  }, [matchId])

  async function handleSubmit() {
    if (!nickname.trim()) { setError("닉네임을 입력해주세요"); return }
    if (!content.trim()) { setError("댓글을 입력해주세요"); return }
    if (content.trim().length > 200) { setError("200자 이내로 작성해주세요"); return }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, nickname: nickname.trim(), content: content.trim(), homeTeam, awayTeam }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "오류가 발생했습니다")
        return
      }

      // 닉네임 저장
      localStorage.setItem("goalline_nickname", nickname.trim())

      // 댓글 추가
      setComments(prev => [...prev, data.comment])
      setContent("")

      // 스크롤 하단으로
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
    } catch {
      setError("네트워크 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-turf-line/40 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 bg-turf/40 border-b border-turf-line/40">
        <h3 className="text-sm font-semibold text-floodlight/80">
          💬 경기 반응
        </h3>
        <span className="text-xs text-floodlight/40 font-data">{comments.length}개</span>
      </div>

      {/* 댓글 목록 */}
      <div className="max-h-72 overflow-y-auto divide-y divide-turf-line/20 bg-turf/20">
        {comments.length === 0 ? (
          <div className="py-8 text-center text-floodlight/30 text-sm">
            첫 번째 반응을 남겨보세요!
          </div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="px-4 py-3 flex gap-3">
              {/* 아바타 */}
              <div className="w-7 h-7 rounded-full bg-score-amber/20 flex items-center justify-center shrink-0 text-xs font-bold text-score-amber">
                {c.nickname[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-floodlight/80">{c.nickname}</span>
                  <span className="text-[10px] text-floodlight/30">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-floodlight/70 mt-0.5 leading-relaxed break-words">
                  {c.content}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="px-4 py-3 bg-turf/40 border-t border-turf-line/40 space-y-2">
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="닉네임"
            maxLength={20}
            className="w-24 shrink-0 bg-turf-line/30 border border-turf-line/50 text-xs text-floodlight px-2.5 py-2 rounded focus:outline-none focus:border-score-amber placeholder:text-floodlight/30"
          />
          <input
            type="text"
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder={`${homeTeam} vs ${awayTeam} 반응을 남겨보세요 (200자)`}
            maxLength={200}
            className="flex-1 bg-turf-line/30 border border-turf-line/50 text-xs text-floodlight px-2.5 py-2 rounded focus:outline-none focus:border-score-amber placeholder:text-floodlight/30"
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="shrink-0 bg-score-amber text-pitch-night text-xs font-bold px-3 py-2 rounded hover:bg-score-amber/80 transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "등록"}
          </button>
        </div>
        <p className="text-[10px] text-floodlight/20">욕설·스팸은 삭제됩니다</p>
      </div>
    </div>
  )
}
