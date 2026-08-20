import PlayerAvatar from "@/components/PlayerAvatar"

type LineupPlayer = {
  player: { id: number; name: string; number: number; pos: string; grid: string | null }
}

type Lineup = {
  team: { name: string; logo: string }
  formation: string
  startXI: LineupPlayer[]
  substitutes?: LineupPlayer[]
  coach: { name: string; photo?: string }
}

type PlayerStat = {
  team: { name: string; logo: string }
  players: {
    player: { id?: number; name: string; photo: string }
    statistics: {
      games: { rating: string | null; position: string }
      goals: { total: number | null; assists: number | null }
    }[]
  }[]
}

type MatchEvent = {
  time: { elapsed: number; extra: number | null }
  team: { name: string; logo: string }
  player: { name: string }
  assist: { name: string | null }
  type: string
  detail: string
}

type Enriched = {
  rating: string | null
  photo: string | null
  goals: number
}

const POS_KR: Record<string, string> = { G: "골키퍼", D: "수비수", M: "미드필더", F: "공격수" }

function ratingBadgeClass(rating: string, isMotm: boolean) {
  if (isMotm) return "bg-blue-500 text-white"
  return Number(rating) >= 7 ? "bg-green-600 text-white" : "bg-orange-500 text-white"
}

// playerStats에서 선수 id/이름으로 평점·사진 찾기용 맵 생성
function buildEnrichment(playerStats: PlayerStat[]) {
  const byId = new Map<number, Enriched>()
  const byName = new Map<string, Enriched>()
  let motmRating = 0
  let motmKey = ""

  for (const team of playerStats) {
    for (const p of team.players) {
      const stat = p.statistics[0]
      const entry: Enriched = {
        rating: stat?.games?.rating ?? null,
        photo: p.player.photo ?? null,
        goals: stat?.goals?.total ?? 0,
      }
      if (p.player.id != null) byId.set(p.player.id, entry)
      byName.set(p.player.name, entry)
      const r = Number(stat?.games?.rating)
      if (r > motmRating) {
        motmRating = r
        motmKey = p.player.id != null ? `id:${p.player.id}` : `nm:${p.player.name}`
      }
    }
  }
  return { byId, byName, motmKey }
}

function lookup(
  maps: ReturnType<typeof buildEnrichment>,
  id: number,
  name: string
): { data: Enriched | null; isMotm: boolean } {
  const data = maps.byId.get(id) ?? maps.byName.get(name) ?? null
  const isMotm = maps.motmKey === `id:${id}` || maps.motmKey === `nm:${name}`
  return { data, isMotm }
}

// 이벤트에서 선수별 부가정보 추출 (교체 아웃/인 시간, 카드, 골)
// API-Football 교체 이벤트: player = 나가는 선수, assist = 들어오는 선수
function buildEventInfo(events: MatchEvent[]) {
  const subOut = new Map<string, string>()
  const subIn = new Map<string, string>()
  const yellow = new Set<string>()
  const red = new Set<string>()

  for (const ev of events) {
    const minute = `${ev.time.elapsed}${ev.time.extra ? `+${ev.time.extra}` : ""}'`
    if (ev.type === "subst") {
      subOut.set(ev.player.name, minute)
      if (ev.assist.name) subIn.set(ev.assist.name, minute)
    } else if (ev.type === "Card") {
      if (ev.detail === "Red Card") red.add(ev.player.name)
      else yellow.add(ev.player.name)
    }
  }
  return { subOut, subIn, yellow, red }
}

// 그리드("row:col") 기반 피치 좌표 계산. 홈=왼쪽 절반, 원정=오른쪽 절반(미러)
function gridToPosition(grid: string | null, maxRow: number, colsInRow: number, col: number, isHome: boolean) {
  if (!grid) return null
  const [rowStr] = grid.split(":")
  const row = Number(rowStr)
  const xHalf = ((row - 0.5) / maxRow) * 44 + 3 // 3%~47%
  const x = isHome ? xHalf : 100 - xHalf
  const yBase = ((col - 0.5) / colsInRow) * 84 + 8 // 8%~92%
  const y = isHome ? yBase : 100 - yBase
  return { x, y }
}

function PlayerNode({
  lp,
  maps,
  evInfo,
  x,
  y,
}: {
  lp: LineupPlayer
  maps: ReturnType<typeof buildEnrichment>
  evInfo: ReturnType<typeof buildEventInfo>
  x: number
  y: number
}) {
  const { data, isMotm } = lookup(maps, lp.player.id, lp.player.name)
  const outMinute = evInfo.subOut.get(lp.player.name)
  const hasYellow = evInfo.yellow.has(lp.player.name)
  const hasRed = evInfo.red.has(lp.player.name)
  const goals = data?.goals ?? 0

  return (
    <div
      className="absolute flex flex-col items-center w-16 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className="relative">
        <PlayerAvatar
          src={data?.photo ?? ""}
          alt={lp.player.name}
          className="w-10 h-10 rounded-full object-cover bg-turf-line text-xs"
        />
        {data?.rating && (
          <span
            className={`absolute -top-1.5 -right-3 px-1 rounded-full text-[9px] font-data font-bold leading-4 ${ratingBadgeClass(data.rating, isMotm)}`}
          >
            {data.rating}
            {isMotm && "★"}
          </span>
        )}
        {outMinute && (
          <span className="absolute -top-1.5 -left-4 text-[8px] font-data text-live-red leading-3 text-right">
            {outMinute}
            <span className="block text-live-red">←</span>
          </span>
        )}
        {(hasYellow || hasRed) && (
          <span
            className={`absolute bottom-0 -left-1.5 w-2 h-3 rounded-[1px] ${hasRed ? "bg-live-red" : "bg-yellow-400"}`}
          />
        )}
        {goals > 0 && (
          <span className="absolute -bottom-1 -right-1 text-[10px]">⚽</span>
        )}
      </div>
      <span className="mt-1 text-[10px] text-floodlight/90 leading-tight text-center truncate w-16">
        <span className="text-floodlight/40">{lp.player.number} </span>
        {lp.player.name.split(" ").pop()}
      </span>
    </div>
  )
}

// 피치 위 선수 배치 (팀 하나 = 절반)
function TeamOnPitch({
  lineup,
  maps,
  evInfo,
  isHome,
}: {
  lineup: Lineup
  maps: ReturnType<typeof buildEnrichment>
  evInfo: ReturnType<typeof buildEventInfo>
  isHome: boolean
}) {
  const rows = new Map<number, LineupPlayer[]>()
  let maxRow = 1
  for (const lp of lineup.startXI) {
    if (!lp.player.grid) continue
    const row = Number(lp.player.grid.split(":")[0])
    maxRow = Math.max(maxRow, row)
    if (!rows.has(row)) rows.set(row, [])
    rows.get(row)!.push(lp)
  }
  // 각 행 내에서 col 순 정렬
  for (const list of rows.values()) {
    list.sort((a, b) => Number(a.player.grid!.split(":")[1]) - Number(b.player.grid!.split(":")[1]))
  }

  return (
    <>
      {[...rows.entries()].flatMap(([, list]) =>
        list.map((lp, idx) => {
          const pos = gridToPosition(lp.player.grid, maxRow, list.length, idx + 1, isHome)
          if (!pos) return null
          return (
            <PlayerNode key={lp.player.id} lp={lp} maps={maps} evInfo={evInfo} x={pos.x} y={pos.y} />
          )
        })
      )}
    </>
  )
}

function teamAvgRating(playerStats: PlayerStat[], teamName: string): string | null {
  const team = playerStats.find((t) => t.team.name === teamName)
  if (!team) return null
  const ratings = team.players
    .map((p) => Number(p.statistics[0]?.games?.rating))
    .filter((r) => !isNaN(r) && r > 0)
  if (ratings.length === 0) return null
  return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
}

function SubstituteRow({
  lp,
  maps,
  evInfo,
}: {
  lp: LineupPlayer
  maps: ReturnType<typeof buildEnrichment>
  evInfo: ReturnType<typeof buildEventInfo>
}) {
  const { data, isMotm } = lookup(maps, lp.player.id, lp.player.name)
  const inMinute = evInfo.subIn.get(lp.player.name)
  const hasYellow = evInfo.yellow.has(lp.player.name)
  const goals = data?.goals ?? 0

  return (
    <div className="flex items-center gap-3 py-2 border-b border-turf-line/30 last:border-b-0">
      <PlayerAvatar
        src={data?.photo ?? ""}
        alt={lp.player.name}
        className="w-9 h-9 rounded-full object-cover bg-turf-line text-xs shrink-0"
      />
      {data?.rating && (
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-data font-bold shrink-0 ${ratingBadgeClass(data.rating, isMotm)}`}
        >
          {data.rating}
        </span>
      )}
      <span className="font-data text-xs text-floodlight/40 w-5 shrink-0">{lp.player.number}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-floodlight/90 truncate">{lp.player.name}</p>
        <p className="text-[11px] text-floodlight/40">{POS_KR[lp.player.pos] ?? lp.player.pos}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 text-xs">
        {goals > 0 && <span>⚽</span>}
        {hasYellow && <span className="inline-block w-2 h-3 rounded-[1px] bg-yellow-400" />}
        {inMinute && (
          <span className="font-data text-green-400">
            {inMinute} <span className="text-green-400">→</span>
          </span>
        )}
      </div>
    </div>
  )
}

export default function FotmobLineup({
  lineups,
  playerStats,
  events,
}: {
  lineups: Lineup[]
  playerStats: PlayerStat[]
  events: MatchEvent[]
}) {
  if (lineups.length !== 2) {
    return <p className="text-floodlight/40 text-sm py-6 text-center">라인업 정보가 없습니다.</p>
  }

  const [home, away] = lineups
  const maps = buildEnrichment(playerStats)
  const evInfo = buildEventInfo(events)
  const homeAvg = teamAvgRating(playerStats, home.team.name)
  const awayAvg = teamAvgRating(playerStats, away.team.name)

  return (
    <div>
      {/* 팀 헤더: 평균 평점 + 로고 + 팀명 + 포메이션 */}
      <div className="flex items-center justify-between gap-2 mb-4 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          {homeAvg && (
            <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-data font-bold ${Number(homeAvg) >= 7 ? "bg-green-600" : "bg-orange-500"} text-white`}>
              {homeAvg}
            </span>
          )}
          <img src={home.team.logo} alt="" className="w-5 h-5 shrink-0" />
          <span className="truncate font-medium">{home.team.name}</span>
          <span className="text-floodlight/40 font-data text-xs shrink-0">{home.formation}</span>
        </div>
        <div className="flex items-center gap-2 min-w-0 justify-end">
          <span className="text-floodlight/40 font-data text-xs shrink-0">{away.formation}</span>
          <span className="truncate font-medium">{away.team.name}</span>
          <img src={away.team.logo} alt="" className="w-5 h-5 shrink-0" />
          {awayAvg && (
            <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-data font-bold ${Number(awayAvg) >= 7 ? "bg-green-600" : "bg-orange-500"} text-white`}>
              {awayAvg}
            </span>
          )}
        </div>
      </div>

      {/* 가로형 피치 */}
      <div
        className="relative w-full h-[440px] rounded-md overflow-hidden border border-turf-line/40"
        style={{
          background:
            "repeating-linear-gradient(90deg, rgba(30,58,40,0.9) 0%, rgba(30,58,40,0.9) 12.5%, rgba(24,48,33,0.9) 12.5%, rgba(24,48,33,0.9) 25%)",
        }}
      >
        {/* 중앙선/서클 */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-floodlight/15" />
        <div className="absolute left-1/2 top-1/2 w-20 h-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-floodlight/15" />
        {/* 페널티 박스 */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[9%] h-[46%] border border-l-0 border-floodlight/15" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[9%] h-[46%] border border-r-0 border-floodlight/15" />

        <TeamOnPitch lineup={home} maps={maps} evInfo={evInfo} isHome={true} />
        <TeamOnPitch lineup={away} maps={maps} evInfo={evInfo} isHome={false} />
      </div>

      {/* 감독 */}
      <div className="flex items-center justify-between gap-2 mt-5 pb-4 border-b border-turf-line/40">
        <div className="flex items-center gap-2 min-w-0">
          <PlayerAvatar
            src={home.coach?.photo ?? ""}
            alt={home.coach?.name ?? "-"}
            className="w-8 h-8 rounded-full object-cover bg-turf-line text-[10px] shrink-0"
          />
          <span className="text-sm truncate">{home.coach?.name ?? "-"}</span>
        </div>
        <span className="text-xs text-floodlight/40 shrink-0">감독</span>
        <div className="flex items-center gap-2 min-w-0 justify-end">
          <span className="text-sm truncate">{away.coach?.name ?? "-"}</span>
          <PlayerAvatar
            src={away.coach?.photo ?? ""}
            alt={away.coach?.name ?? "-"}
            className="w-8 h-8 rounded-full object-cover bg-turf-line text-[10px] shrink-0"
          />
        </div>
      </div>

      {/* 교체명단 */}
      {((home.substitutes?.length ?? 0) > 0 || (away.substitutes?.length ?? 0) > 0) && (
        <div className="mt-4">
          <p className="text-center text-xs text-floodlight/40 mb-2">교체명단</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <div>
              {(home.substitutes ?? []).map((lp) => (
                <SubstituteRow key={lp.player.id} lp={lp} maps={maps} evInfo={evInfo} />
              ))}
            </div>
            <div>
              {(away.substitutes ?? []).map((lp) => (
                <SubstituteRow key={lp.player.id} lp={lp} maps={maps} evInfo={evInfo} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
