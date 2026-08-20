type Statistic = {
  team: { name: string }
  statistics: { type: string; value: number | string | null }[]
}

// API-Football 통계 항목명 → 한국어 라벨
const LABEL_KR: Record<string, string> = {
  "ball possession": "공 점유율",
  "expected_goals": "예상 골 (xG)",
  "total shots": "전체 슛",
  "shots on goal": "유효 슛",
  "shots off goal": "빗나간 슛",
  "blocked shots": "차단된 슛",
  "shots insidebox": "박스 안 슛",
  "shots outsidebox": "박스 밖 슛",
  "total passes": "패스",
  "passes accurate": "정확한 패스",
  "passes %": "패스 성공률",
  "goalkeeper saves": "선방",
  "goals_prevented": "실점 방지 (xG)",
  "fouls": "파울",
  "yellow cards": "옐로카드",
  "red cards": "레드카드",
  "offsides": "오프사이드",
  "corner kicks": "코너킥",
}

// 낮을수록 좋은 항목 (하이라이트 방향 반전)
const LOWER_IS_BETTER = new Set(["fouls", "yellow cards", "red cards", "offsides"])

// 섹션 구성 (FotMob 스타일 카테고리)
const SECTIONS: { title: string | null; keys: string[] }[] = [
  {
    title: "최고 통계",
    keys: ["ball possession", "expected_goals", "total shots", "shots on goal", "corner kicks", "fouls"],
  },
  {
    title: "슛",
    keys: ["total shots", "shots on goal", "shots off goal", "blocked shots", "shots insidebox", "shots outsidebox"],
  },
  {
    title: "패스",
    keys: ["total passes", "passes accurate", "passes %"],
  },
  {
    title: "수비",
    keys: ["goalkeeper saves", "goals_prevented"],
  },
  {
    title: "규율",
    keys: ["yellow cards", "red cards", "fouls", "offsides"],
  },
]

function toNumber(value: number | string | null): number {
  if (value === null) return 0
  if (typeof value === "number") return value
  return Number(String(value).replace("%", "")) || 0
}

function StatRow({
  label,
  home,
  away,
  lowerIsBetter,
}: {
  label: string
  home: number | string | null
  away: number | string | null
  lowerIsBetter: boolean
}) {
  const h = toNumber(home)
  const a = toNumber(away)
  const homeWins = lowerIsBetter ? h < a : h > a
  const awayWins = lowerIsBetter ? a < h : a > h

  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span
        className={`min-w-[3rem] text-center font-data font-medium px-2 py-0.5 rounded-full ${
          homeWins ? "bg-score-amber text-pitch-night" : "text-floodlight/80"
        }`}
      >
        {home ?? 0}
      </span>
      <span className="text-floodlight/50 text-xs px-2 text-center">{label}</span>
      <span
        className={`min-w-[3rem] text-center font-data font-medium px-2 py-0.5 rounded-full ${
          awayWins ? "bg-floodlight/80 text-pitch-night" : "text-floodlight/80"
        }`}
      >
        {away ?? 0}
      </span>
    </div>
  )
}

function PossessionBar({ home, away }: { home: number | string | null; away: number | string | null }) {
  const h = toNumber(home)
  const a = toNumber(away)
  return (
    <div className="py-2">
      <p className="text-center text-xs text-floodlight/50 mb-2">공 점유율</p>
      <div className="flex h-7 overflow-hidden rounded-full text-xs font-data font-bold">
        <div
          className="bg-score-amber text-pitch-night flex items-center pl-3"
          style={{ width: `${h}%` }}
        >
          {h}%
        </div>
        <div
          className="bg-floodlight/30 text-floodlight flex items-center justify-end pr-3"
          style={{ width: `${a}%` }}
        >
          {a}%
        </div>
      </div>
    </div>
  )
}

export default function MatchStatsPanel({ stats }: { stats: Statistic[] }) {
  if (stats.length !== 2) {
    return <p className="text-floodlight/40 text-sm py-6 text-center">통계 정보가 없습니다.</p>
  }

  // type(소문자) → {home, away} 맵 구성
  const statMap = new Map<string, { home: number | string | null; away: number | string | null }>()
  stats[0].statistics.forEach((s) => {
    statMap.set(s.type.toLowerCase(), { home: s.value, away: null })
  })
  stats[1].statistics.forEach((s) => {
    const key = s.type.toLowerCase()
    const existing = statMap.get(key)
    if (existing) existing.away = s.value
    else statMap.set(key, { home: null, away: s.value })
  })

  return (
    <div className="space-y-6">
      {SECTIONS.map((section) => {
        const rows = section.keys
          .map((key) => {
            const v = statMap.get(key)
            if (!v) return null
            return { key, label: LABEL_KR[key] ?? key, ...v }
          })
          .filter((r): r is NonNullable<typeof r> => r !== null)

        if (rows.length === 0) return null

        return (
          <div key={section.title}>
            {section.title && (
              <h4 className="text-center text-sm font-medium text-floodlight/70 mb-2">
                {section.title}
              </h4>
            )}
            <div className="divide-y divide-turf-line/30">
              {rows.map((row) =>
                row.key === "ball possession" ? (
                  <PossessionBar key={row.key} home={row.home} away={row.away} />
                ) : (
                  <StatRow
                    key={row.key}
                    label={row.label}
                    home={row.home}
                    away={row.away}
                    lowerIsBetter={LOWER_IS_BETTER.has(row.key)}
                  />
                )
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
