"use client"

import { useRouter, useSearchParams } from "next/navigation"

// 최근 10시즌 선택 드롭다운. URL 쿼리(?season=YYYY)로 상태를 관리해서
// 서버 컴포넌트인 페이지가 선택된 시즌 데이터를 다시 불러오게 함
export default function SeasonDropdown({ currentSeason }: { currentSeason: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const seasons = Array.from({ length: 10 }, (_, i) => currentSeason - i)

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("season", e.target.value)
    router.push(`?${params.toString()}`)
  }

  return (
    <select
      value={currentSeason}
      onChange={handleChange}
      className="bg-turf-line/40 border border-turf-line text-floodlight text-sm rounded-full px-3 py-1.5 focus:outline-none focus:border-score-amber cursor-pointer"
    >
      {seasons.map((s) => (
        <option key={s} value={s} className="bg-pitch-night">
          {s}/{s + 1}
        </option>
      ))}
    </select>
  )
}
