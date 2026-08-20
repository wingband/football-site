type Statistic = {
  team: { name: string }
  statistics: { type: string; value: number | string | null }[]
}

const KEY_STATS: { match: string[]; label: string }[] = [
  { match: ["ball possession"], label: "점유율" },
  { match: ["expected_goals", "expected goals"], label: "예상 골 (xG)" },
  { match: ["total shots"], label: "전체 슛" },
  { match: ["shots on goal"], label: "유효 슛" },
]

function findStat(list: { type: string; value: number | string | null }[], names: string[]) {
  return list.find((s) => names.includes(s.type.toLowerCase()))
}

function toNumber(value: number | string | null) {
  if (value === null) return 0
  if (typeof value === "number") return value
  return Number(String(value).replace("%", "")) || 0
}

export default function KeyStatsPanel({ stats }: { stats: Statistic[] }) {
  if (stats.length !== 2) {
    return <p className="text-floodlight/40 text-sm py-4">주요 통계 정보가 없습니다.</p>
  }

  const rows = KEY_STATS.map(({ match, label }) => {
    const home = findStat(stats[0].statistics, match)
    const away = findStat(stats[1].statistics, match)
    if (!home && !away) return null
    return { label, home: home?.value ?? 0, away: away?.value ?? 0, isPercent: match[0] === "ball possession" }
  }).filter((r): r is NonNullable<typeof r> => r !== null)

  if (rows.length === 0) {
    return <p className="text-floodlight/40 text-sm py-4">주요 통계 정보가 없습니다.</p>
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => {
        if (row.isPercent) {
          const homePct = toNumber(row.home)
          const awayPct = toNumber(row.away)
          return (
            <div key={row.label}>
              <p className="text-center text-xs text-floodlight/40 mb-2">{row.label}</p>
              <div className="flex h-6 overflow-hidden text-xs font-data font-medium">
                <div
                  className="bg-score-amber text-pitch-night flex items-center justify-start pl-2"
                  style={{ width: `${homePct}%` }}
                >
                  {homePct}%
                </div>
                <div
                  className="bg-floodlight/25 text-floodlight flex items-center justify-end pr-2"
                  style={{ width: `${awayPct}%` }}
                >
                  {awayPct}%
                </div>
              </div>
            </div>
          )
        }

        return (
          <div key={row.label} className="flex items-center justify-between text-sm font-data">
            <span className="bg-score-amber/15 text-score-amber font-medium px-2.5 py-1 rounded-full min-w-[2.5rem] text-center">
              {row.home}
            </span>
            <span className="text-floodlight/50 text-xs font-sans">{row.label}</span>
            <span className="text-floodlight/70 font-medium">{row.away}</span>
          </div>
        )
      })}
    </div>
  )
}
