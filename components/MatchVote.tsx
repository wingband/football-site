"use client"

import { useState, useEffect, useSyncExternalStore } from "react"

type Votes = { great: number; boring: number; surprising: number }

const REACTIONS = [
  { key: "great",      emoji: "🔥", label: "명경기" },
  { key: "boring",     emoji: "😴", label: "지루해" },
  { key: "surprising", emoji: "😱", label: "반전" },
] as const

// "이미 투표했는지"는 localStorage에만 있는 값이라 서버 렌더 시점엔 알 수 없다.
// useState+useEffect로 마운트 후 읽어오는 대신 useSyncExternalStore로 구독해서
// 서버 스냅샷(null) → 클라이언트 스냅샷 순서로 안전하게 하이드레이션되게 한다.
const voteListeners = new Set<() => void>()
function subscribeVote(cb: () => void) {
  voteListeners.add(cb)
  return () => { voteListeners.delete(cb) }
}
function readStoredVote(matchId: number) {
  try {
    return localStorage.getItem(`vote_${matchId}`)
  } catch {
    return null // 시크릿 모드 등 저장소 접근이 막힌 브라우저
  }
}
function writeStoredVote(matchId: number, reaction: string) {
  try {
    localStorage.setItem(`vote_${matchId}`, reaction)
  } catch {}
  voteListeners.forEach((cb) => cb())
}

export default function MatchVote({ matchId }: { matchId: number }) {
  const [votes, setVotes] = useState<Votes>({ great: 0, boring: 0, surprising: 0 })
  const [loading, setLoading] = useState(false)
  // 이미 투표했는지 확인 (서버에선 항상 null)
  const voted = useSyncExternalStore(
    subscribeVote,
    () => readStoredVote(matchId),
    () => null
  )

  useEffect(() => {
    // 현재 투표 현황 로드
    fetch(`/api/vote?matchId=${matchId}`)
      .then(r => r.json())
      .then(d => d.votes && setVotes(d.votes))
      .catch(() => {})
  }, [matchId])

  async function handleVote(reaction: string) {
    if (voted || loading) return
    setLoading(true)

    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, reaction }),
      })
      const data = await res.json()
      if (data.votes) {
        setVotes(data.votes)
        writeStoredVote(matchId, reaction)
      }
    } finally {
      setLoading(false)
    }
  }

  const total = votes.great + votes.boring + votes.surprising

  return (
    <div className="bg-turf/40 border border-turf-line/40 p-4">
      <p className="text-sm font-medium text-center mb-4 text-floodlight/80">
        이 경기 어땠나요?
      </p>
      <div className="flex gap-3 justify-center">
        {REACTIONS.map(({ key, emoji, label }) => {
          const count = votes[key]
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const isVoted = voted === key

          return (
            <button
              key={key}
              onClick={() => handleVote(key)}
              disabled={!!voted || loading}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded transition-all ${
                isVoted
                  ? "bg-score-amber/20 border border-score-amber text-score-amber"
                  : voted
                  ? "opacity-50 cursor-not-allowed bg-turf-line/20"
                  : "bg-turf-line/20 hover:bg-turf-line/40 cursor-pointer"
              }`}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-xs font-medium">{label}</span>
              {voted && (
                <span className="text-xs font-data font-bold text-floodlight/60">
                  {pct}% ({count})
                </span>
              )}
            </button>
          )
        })}
      </div>
      {voted && (
        <p className="text-xs text-floodlight/30 text-center mt-3">
          총 {total}명 참여
        </p>
      )}
    </div>
  )
}
