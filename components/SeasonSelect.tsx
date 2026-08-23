"use client"

import { useRouter } from "next/navigation"
import { formatSeasonLabel } from "@/lib/season"

// 순위표 시즌 선택 드롭다운. 리그 탭과 같은 pill 스타일을 쓰고,
// 고르면 ?season= 파라미터를 바꿔서 서버에서 해당 시즌 순위표를 다시 받아온다
export default function SeasonSelect({
  seasons,
  current,
}: {
  seasons: number[]
  current: number
}) {
  const router = useRouter()

  return (
    <div className="relative shrink-0">
      <select
        aria-label="시즌 선택"
        value={current}
        onChange={(e) => router.push(`/standings?season=${e.target.value}`)}
        className="appearance-none cursor-pointer bg-turf-line/30 hover:bg-turf-line/50 rounded-full pl-3 pr-8 py-2 text-xs text-floodlight/70 hover:text-floodlight transition-colors focus:outline-none focus:ring-1 focus:ring-score-amber/50"
      >
        {seasons.map((s) => (
          <option key={s} value={s} className="bg-pitch-night text-floodlight">
            {formatSeasonLabel(s)} 시즌
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-floodlight/40">
        ▼
      </span>
    </div>
  )
}
