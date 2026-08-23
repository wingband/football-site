"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

type Comment = {
  id: number
  match_id: number
  nickname: string
  content: string
  home_team: string
  away_team: string
  created_at: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "방금"
  if (m < 60) return `${m}분 전`
  return `${Math.floor(diff / 3600000)}시간 전`
}

export default function LiveCommentsWidget() {
  const [comments, setComments] = useState<Comment[]>([])

  useEffect(() => {
    const load = () => {
      fetch("/api/comments?latest=1")
        .then(r => r.json())
        .then(d => setComments(d.comments ?? []))
        .catch(() => {})
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  if (comments.length === 0) return null

  return (
    <div className="bg-turf/30 border border-turf-line/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-turf-line/30">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold text-floodlight/70">실시간 반응</span>
        </div>
      </div>
      <div className="divide-y divide-turf-line/20">
        {comments.slice(0, 5).map(c => (
          <Link key={c.id} href={`/matches/${c.match_id}`}
            className="flex gap-2.5 px-4 py-2.5 hover:bg-turf-line/20 transition-colors group">
            {/* 아바타 */}
            <div className="w-6 h-6 rounded-full bg-score-amber/20 flex items-center justify-center shrink-0 text-[10px] font-bold text-score-amber">
              {c.nickname[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-semibold text-floodlight/60">{c.nickname}</span>
                <span className="text-[9px] text-floodlight/30">{timeAgo(c.created_at)}</span>
              </div>
              {/* 경기명 */}
              <p className="text-[9px] text-score-amber/70 truncate">
                {c.home_team} vs {c.away_team}
              </p>
              {/* 댓글 내용 */}
              <p className="text-xs text-floodlight/70 line-clamp-1 group-hover:text-floodlight/90 transition-colors">
                {c.content}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
