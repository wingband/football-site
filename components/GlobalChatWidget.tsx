"use client"

import { useState, useEffect, useRef } from "react"
import { useUser, SignInButton } from "@clerk/nextjs"
import { supabase } from "@/lib/supabase"

const MAX_LENGTH = 100

type ChatMessage = {
  id: number
  user_id: string
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

export default function GlobalChatWidget() {
  const { isSignedIn, user } = useUser()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  // 최근 50개 로드 + Realtime 구독
  useEffect(() => {
    fetch("/api/global-chat")
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return
        setMessages(data)
        setTimeout(() => bottomRef.current?.scrollIntoView(), 100)
      })
      .catch(() => {})

    const channel = supabase
      .channel("global-chat")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "global_chat",
      }, (payload) => {
        const incoming = payload.new as ChatMessage
        setMessages(prev => (
          // Realtime 이벤트가 중복으로 올 수 있어서 id로 한 번 걸러줌
          prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]
        ))
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function handleSubmit() {
    if (!isSignedIn || loading) return
    const trimmed = content.trim()
    if (!trimmed) { setError("내용을 입력해주세요"); return }
    if (trimmed.length > MAX_LENGTH) { setError(`${MAX_LENGTH}자 이내로 작성해주세요`); return }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/global-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // user_id / nickname은 서버가 세션에서 직접 채운다
        body: JSON.stringify({ content: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "오류 발생"); return }

      // 목록 추가는 Realtime이 처리
      setContent("")
    } catch {
      setError("네트워크 오류")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-turf-line/40 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 bg-turf/40 border-b border-turf-line/40">
        <h3 className="text-sm font-semibold text-floodlight/80">🌍 글로벌 채팅</h3>
        <span className="flex items-center gap-1.5 text-xs text-floodlight/40">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="font-data">{messages.length}</span>
        </span>
      </div>

      {/* 메시지 목록 */}
      <div className="max-h-72 overflow-y-auto divide-y divide-turf-line/20 bg-turf/20">
        {messages.length === 0 ? (
          <div className="py-8 text-center text-floodlight/30 text-sm">
            첫 번째 메시지를 남겨보세요!
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="px-4 py-3 flex gap-3">
              <div className="w-7 h-7 rounded-full bg-score-amber/20 flex items-center justify-center shrink-0 text-xs font-bold text-score-amber">
                {m.nickname[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-floodlight/80 truncate">{m.nickname}</span>
                  <span className="text-[10px] text-floodlight/30 shrink-0">{timeAgo(m.created_at)}</span>
                </div>
                <p className="text-sm text-floodlight/70 mt-0.5 leading-relaxed break-words">{m.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="px-4 py-3 bg-turf/40 border-t border-turf-line/40">
        {isSignedIn ? (
          <div className="space-y-2">
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={content}
                onChange={e => setContent(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder={`메시지 입력 (${MAX_LENGTH}자)`}
                maxLength={MAX_LENGTH}
                className="flex-1 min-w-0 bg-turf-line/30 border border-turf-line/50 text-xs text-floodlight px-3 py-2 rounded focus:outline-none focus:border-score-amber placeholder:text-floodlight/30"
              />
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="shrink-0 bg-score-amber text-pitch-night text-xs font-bold px-3 py-2 rounded hover:bg-score-amber/80 transition-colors disabled:opacity-50"
              >
                {loading ? "..." : "전송"}
              </button>
            </div>
            <p className="text-[10px] text-floodlight/20">
              {user.username ?? user.firstName ?? "익명"} · 욕설·스팸은 삭제됩니다
            </p>
          </div>
        ) : (
          /* 비로그인: 읽기는 되지만 입력은 막고 로그인 유도 */
          <div className="space-y-2">
            <p className="text-xs text-floodlight/40">로그인 후 채팅 가능</p>
            <SignInButton mode="modal">
              <button className="w-full text-xs px-4 py-2 bg-score-amber text-pitch-night font-bold rounded hover:bg-score-amber/80 transition-colors">
                로그인하고 채팅하기
              </button>
            </SignInButton>
          </div>
        )}
      </div>
    </div>
  )
}
