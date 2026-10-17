import { DIST_LEAGUES, MIN_MINUTES, getLeagueDist, metricsOf, percentileOf, type MetricKey, type Position } from "@/lib/leagueDist"
import type { PlayerSeasonStat } from "@/lib/playerData"

// 선수 페이지 "리그 내 비교" (2026-10-17): 같은 리그·같은 포지션 선수(270분 이상) 대비 백분위.
// 막대(상위 n%)와 선수 특성 육각형. 데이터는 league_stat_dist 표에서만 읽는다 (API 호출 없음).

const POS_KO: Record<Position, string> = { Goalkeeper: "골키퍼", Defender: "수비수", Midfielder: "미드필더", Attacker: "공격수" }

type BarDef = { key: MetricKey; label: string; unit: "p90" | "pct" | "raw"; lowerBetter?: boolean }
const OUTFIELD_BARS: { title: string; items: BarDef[] }[] = [
  { title: "공격", items: [
    { key: "goals", label: "득점", unit: "p90" },
    { key: "assists", label: "도움", unit: "p90" },
    { key: "shots", label: "슈팅", unit: "p90" },
    { key: "shotsOn", label: "유효 슈팅", unit: "p90" },
  ] },
  { title: "패스 · 드리블", items: [
    { key: "keyPasses", label: "키패스", unit: "p90" },
    { key: "passes", label: "패스", unit: "p90" },
    { key: "passAccuracy", label: "패스 성공률", unit: "pct" },
    { key: "dribbles", label: "드리블 성공", unit: "p90" },
    { key: "foulsDrawn", label: "파울 유도", unit: "p90" },
  ] },
  { title: "수비 · 경합", items: [
    { key: "tackles", label: "태클", unit: "p90" },
    { key: "interceptions", label: "가로채기", unit: "p90" },
    { key: "blocks", label: "블록", unit: "p90" },
    { key: "duelsPct", label: "경합 승률", unit: "pct" },
  ] },
]
const GK_BARS: { title: string; items: BarDef[] }[] = [
  { title: "골키핑", items: [
    { key: "saves", label: "선방", unit: "p90" },
    { key: "conceded", label: "실점", unit: "p90", lowerBetter: true },
    { key: "passAccuracy", label: "패스 성공률", unit: "pct" },
  ] },
]
// 육각형 축 (필드 플레이어)
const RADAR_AXES: { key: MetricKey; label: string }[] = [
  { key: "goals", label: "득점" },
  { key: "shots", label: "슈팅" },
  { key: "keyPasses", label: "찬스 메이킹" },
  { key: "dribbles", label: "드리블" },
  { key: "defActions", label: "수비 기여" },
  { key: "duelsPct", label: "경합" },
]

function barColor(p: number) {
  if (p >= 70) return "bg-emerald-400"
  if (p >= 40) return "bg-score-amber"
  return "bg-red-400/80"
}
function fmt(v: number, unit: BarDef["unit"]) {
  if (unit === "pct") return `${v.toFixed(0)}%`
  if (unit === "p90") return v.toFixed(2)
  return v.toFixed(1)
}

export default async function PlayerLeagueCompare({ stat, season }: { stat: PlayerSeasonStat; season: number }) {
  const league = DIST_LEAGUES.find((l) => l.id === stat.league.id)
  if (!league) return null
  const dist = await getLeagueDist(league.id, season)
  const pos = stat.games.position as Position
  const bucket = dist?.positions?.[pos]
  if (!dist || !bucket) return null
  const minutes = stat.games.minutes ?? 0
  const me = metricsOf(stat)

  const section = (body: React.ReactNode) => (
    <div className="border-t border-turf-line/50 pt-4">
      <p className="text-base font-semibold">
        리그 내 비교
        <span className="text-xs text-floodlight/65 ml-2">
          {league.name} {POS_KO[pos] ?? pos} {bucket.n}명 대비 · {MIN_MINUTES}분 이상 출전 선수 기준 · 90분당 환산
        </span>
      </p>
      {body}
    </div>
  )

  if (!me || minutes < MIN_MINUTES) {
    return section(
      <p className="text-sm text-floodlight/60 mt-3">출전 {minutes}분 — {MIN_MINUTES}분 이상 뛰면 같은 포지션 선수들과 비교해 보여드려요.</p>
    )
  }

  const pct = (key: MetricKey, lowerBetter = false) => {
    const v = me[key]
    const arr = bucket.values[key]
    if (v == null || !arr) return null
    const p = percentileOf(v, arr)
    return { v, p: lowerBetter ? 100 - p : p }
  }

  const isGk = pos === "Goalkeeper"
  const groups = (isGk ? GK_BARS : OUTFIELD_BARS)
    .map((g) => ({ title: g.title, items: g.items.map((d) => ({ d, r: pct(d.key, d.lowerBetter) })).filter((x) => x.r !== null) }))
    .filter((g) => g.items.length > 0)
  const rating = pct("rating")

  // 육각형 좌표
  const radar = isGk ? [] : RADAR_AXES.map((a) => ({ ...a, r: pct(a.key) })).filter((a) => a.r !== null)
  const radarSvg = (() => {
    if (radar.length < 3) return null
    const cx = 110, cy = 100, R = 70
    const n = radar.length
    const pt = (i: number, rr: number) => {
      const ang = -Math.PI / 2 + (2 * Math.PI * i) / n
      return [cx + rr * Math.cos(ang), cy + rr * Math.sin(ang)] as const
    }
    const ring = (k: number) => Array.from({ length: n }, (_, i) => pt(i, R * k).join(",")).join(" ")
    const shape = radar.map((a, i) => pt(i, (R * (a.r!.p)) / 100).join(",")).join(" ")
    return (
      <svg viewBox="0 0 220 200" className="w-full max-w-[18rem] mx-auto" role="img" aria-label="선수 특성 육각형">
        {[0.25, 0.5, 0.75, 1].map((k) => (
          <polygon key={k} points={ring(k)} fill="none" stroke="currentColor" className="text-floodlight/15" strokeWidth={1} />
        ))}
        {radar.map((_, i) => {
          const [x, y] = pt(i, R)
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" className="text-floodlight/15" strokeWidth={1} />
        })}
        <polygon points={shape} fill="rgb(250 204 21 / 0.25)" stroke="rgb(250 204 21)" strokeWidth={2} />
        {radar.map((a, i) => {
          const [x, y] = pt(i, R + 18)
          const anchor = Math.abs(x - cx) < 6 ? "middle" : x > cx ? "start" : "end"
          return (
            <text key={a.key} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" className="fill-floodlight/80" fontSize={10}>
              {a.label} <tspan className="fill-score-amber" fontWeight={700}>{a.r!.p}</tspan>
            </text>
          )
        })}
      </svg>
    )
  })()

  return section(
    <div className="mt-4 grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] gap-6">
      <div>
        {radarSvg ? (
          <>
            <p className="text-xs text-floodlight/60 mb-1">선수 특성 — 숫자는 상위 백분위(100에 가까울수록 리그 상위)</p>
            {radarSvg}
          </>
        ) : null}
        {rating && (
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xs text-floodlight/60">시즌 평점</span>
            <span className="font-data text-lg font-bold text-floodlight">{rating.v.toFixed(2)}</span>
            <span className="text-xs text-score-amber">상위 {100 - rating.p}%</span>
          </div>
        )}
      </div>
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="text-xs text-floodlight/60 mb-1.5">{g.title}</p>
            <div className="space-y-1.5">
              {g.items.map(({ d, r }) => (
                <div key={d.key} className="grid grid-cols-[6.5rem_3.5rem_minmax(0,1fr)_3.25rem] items-center gap-2 text-sm">
                  <span className="text-floodlight/80 truncate">{d.label}</span>
                  <span className="font-data text-right">{fmt(r!.v, d.unit)}</span>
                  <div className="h-2 bg-turf-line/40 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor(r!.p)}`} style={{ width: `${Math.max(3, r!.p)}%` }} />
                  </div>
                  <span className="text-xs text-floodlight/60 text-right font-data">상위 {100 - r!.p}%</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="text-[11px] text-floodlight/40">색: 초록 = 상위 30%, 노랑 = 중위, 빨강 = 하위 40%. 실점은 적을수록 상위.</p>
      </div>
    </div>
  )
}
