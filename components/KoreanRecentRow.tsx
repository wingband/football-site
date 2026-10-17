"use client"

import Link from "next/link"
import { useState } from "react"
import PlayerAvatar from "@/components/PlayerAvatar"
import PlayerMatchDetailModal, { ScoreLine, ratingColorOf, type RecentRowData } from "@/components/PlayerMatchDetailModal"

export type { RecentRowData } from "@/components/PlayerMatchDetailModal"

// 해외파 "최근 7일 활약" 한 줄. 선수(사진·이름·평점)를 누르면 그 경기의 선수 상세 팝업, 스코어 줄을 누르면 경기 상세 페이지로.
export default function KoreanRecentRow({ r }: { r: RecentRowData }) {
  const [open, setOpen] = useState(false)

  return (
    <li className="flex items-center gap-3 py-2.5">
      <button type="button" onClick={() => setOpen(true)} className="shrink-0 rounded-full" aria-label={`${r.name} 이 경기 상세`}>
        <PlayerAvatar src={r.photo} alt={r.name} className="w-10 h-10 rounded-full ring-2 ring-score-amber/60 hover:ring-score-amber transition" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-floodlight truncate">
          <button type="button" onClick={() => setOpen(true)} className="font-semibold hover:text-score-amber transition-colors">
            {r.name}
          </button>
          <span className="ml-1.5 text-floodlight/50">{r.teamKo}</span>
          {r.goals > 0 && <span className="ml-1.5 text-emerald-300">⚽{r.goals}</span>}
          {r.assists > 0 && <span className="ml-1.5 text-sky-300">🅰️{r.assists}</span>}
          {r.red > 0 && <span className="ml-1.5">🟥</span>}
        </p>
        <Link href={r.matchHref} className="block text-sm text-floodlight/75 truncate hover:text-score-amber transition-colors" title="경기 상세 보기">
          <ScoreLine r={r} />
        </Link>
      </div>
      <button type="button" onClick={() => setOpen(true)} className="text-right shrink-0 leading-tight group" aria-label={`${r.name} 이 경기 상세`}>
        <p className={`font-data text-base font-bold ${ratingColorOf(r.rating)} group-hover:underline`}>{r.rating !== null ? r.rating.toFixed(1) : "-"}</p>
        <p className="text-xs text-floodlight/65">{r.substitute ? "교체 " : "선발 "}{r.minutes}분</p>
      </button>
      {open && <PlayerMatchDetailModal r={r} onClose={() => setOpen(false)} />}
    </li>
  )
}
