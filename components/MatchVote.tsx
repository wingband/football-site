"use client"

import { useState, useEffect } from "react"

type Votes = { great: number; boring: number; surprising: number }

const REACTIONS = [
  { key: "great",      emoji: "🔥", label: "명경기" },
  { key: "boring",     emoji: "😴", label: "지루해" },
  { key: "surprising", emoji: "😱", label: "반전" },
] as const

export default function MatchVote({ matchId }: { matchId: number }) {
  const [votes, setVotes] = useState<Votes>({ great: 0, boring: 0, surprising: 0 })
  const [voted, setVoted] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 이미 투표했는지 확인
    const stored = localStorage.getItem(`vote_${matchId}`)
    if (stored) setVoted(stored)

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
        setVoted(reaction)
        localStorage.setItem(`vote_${matchId}`, reaction)
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
                <span className="text-[10px] font-data font-bold text-floodlight/60">
                  {pct}% ({count})
                </span>
              )}
            </button>
          )
        })}
      </div>
      {voted && (
        <p className="text-[10px] text-floodlight/30 text-center mt-3">
          총 {total}명 참여
        </p>
      )}
    </div>
  )
}
