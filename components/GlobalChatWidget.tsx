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

// 채팅 목록 컨테이너만 맨 아래로 내린다.
// scrollIntoView()는 상위 스크롤 컨테이너(=문서)까지 함께 움직여서,
// 사이드바에 있는 이 위젯 때문에 페이지가 중간부터 시작하는 문제가 있었다
function scrollListToBottom(el: HTMLDivElement | null, smooth = false) {
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" })
}

export default function GlobalChatWidget() {
  const { isSignedIn, user } = useUser()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const listRef = useRef<HTMLDivElement>(null)

  // 최근 50개 로드 + Realtime 구독
  useEffect(() => {
    fetch("/api/global-chat")
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) {
          // 에러 응답({error, code})이면 목록을 비워두지 말고 원인을 보여준다
          console.error("[global-chat] 목록 로드 실패", data)
          setError(data?.error ?? "채팅을 불러오지 못했습니다")
          return
        }
        setMessages(data)
        setTimeout(() => scrollListToBottom(listRef.current), 100)
      })
      .catch(err => console.error("[global-chat] 목록 요청 실패", err))

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
        setTimeout(() => scrollListToBottom(listRef.current, true), 100)
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

      // 응답이 JSON이 아닐 수 있다 (미들웨어 리다이렉트, Vercel 에러 페이지 등).
      // res.json()을 바로 호출하면 그 파싱 에러가 catch로 떨어져서
      // 진짜 원인이 "네트워크 오류"로 덮여버림 → text로 먼저 받고 직접 파싱
      const raw = await res.text()
      let data: { error?: string; code?: string } = {}
      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {
        console.error("[global-chat] JSON 아닌 응답", res.status, raw.slice(0, 300))
      }

      if (!res.ok) {
        console.error("[global-chat] 전송 실패", res.status, data.code ?? "", raw.slice(0, 300))
        setError(data.error ?? `전송 실패 (HTTP ${res.status})`)
        return
      }

      // 목록 추가는 Realtime이 처리
      setContent("")
    } catch (err) {
      console.error("[global-chat] 요청 자체 실패", err)
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
      {/* 메시지가 적어도 최소 높이(16rem)는 유지하고, 최대 500px까지만 늘어난다 */}
      <div ref={listRef} className="min-h-64 max-h-[500px] overflow-y-auto divide-y divide-turf-line/20 bg-turf/20">
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
      </div>

      {/* 입력창 */}
      <div className="px-4 py-3 bg-turf/40 border-t border-turf-line/40">
        {/* 로그인 여부와 무관하게 에러는 항상 보여준다 (목록 로드 실패 포함) */}
        {error && <p className="text-xs text-red-400 mb-2 break-words">{error}</p>}
        {isSignedIn ? (
          <div className="space-y-2">
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
