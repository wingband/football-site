import Link from "next/link"
import PlayerAvatar from "@/components/PlayerAvatar"
import { KOREAN_PLAYERS_ABROAD } from "@/lib/koreanPlayersAbroad"
import { MOCK_KOREAN_ABROAD } from "@/lib/mockData"
import { saveCachedPlayerStat, getCachedPlayerStat, type CachedPlayerStat } from "@/lib/playerStatCache"

type PlayerStat = CachedPlayerStat

async function fetchPlayerStat(playerId: number, season: number, useCache: boolean) {
  const res = await fetch(
    `https://v3.football.api-sports.io/players?id=${playerId}&season=${season}`,
    {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      ...(useCache ? { next: { revalidate: 300 } } : { cache: "no-store" as const }),
    }
  )
  return res.json()
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getPlayerStat(playerId: number, season: number): Promise<PlayerStat | null> {
  let data = await fetchPlayerStat(playerId, season, true)
  if (!data.response?.[0]) {
    await sleep(400)
    data = await fetchPlayerStat(playerId, season, false)
  }
  const fresh: PlayerStat | null = data.response?.[0] ?? null
  if (fresh) {
    await saveCachedPlayerStat(playerId, fresh)
    return fresh
  }
  return getCachedPlayerStat(playerId)
}

// 선수의 최근 경기 날짜 가져오기
async function getLastMatchDate(playerId: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?player=${playerId}&last=1`,
      {
        headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
        next: { revalidate: 3600 },
      }
    )
    const data = await res.json()
    const date = data.response?.[0]?.fixture?.date
    return date ?? null
  } catch {
    return null
  }
}

async function getAllKoreanAbroad(): Promise<(PlayerStat & { lastMatchDate: string | null })[]> {
  if (process.env.USE_MOCK_DATA === "true") {
    return MOCK_KOREAN_ABROAD.map((p) => ({ ...p, lastMatchDate: null }))
  }

  const season = new Date().getFullYear()
  const results = await Promise.all(
    KOREAN_PLAYERS_ABROAD.map(async (p) => {
      const [stat, lastMatchDate] = await Promise.all([
        getPlayerStat(p.id, season),
        getLastMatchDate(p.id),
      ])
      if (!stat) return null
      return { ...stat, lastMatchDate }
    })
  )
  return results.filter((r): r is PlayerStat & { lastMatchDate: string | null } => r !== null)
}

function RatingBadge({ rating }: { rating: string | null | undefined }) {
  if (!rating) return null
  const num = parseFloat(rating)
  const color = num >= 7.5 ? "bg-green-600" : num >= 6.5 ? "bg-orange-500" : "bg-red-600"
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold text-white font-data ${color}`}>
      {parseFloat(rating).toFixed(2)}
    </span>
  )
}

function formatLastMatch(dateStr: string | null): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "오늘"
  if (diffDays === 1) return "어제"
  if (diffDays < 7) return `${diffDays}일 전`
  return d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })
}

export default async function KoreanAbroadWidget() {
  const players = await getAllKoreanAbroad()
  if (players.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🇰🇷</span>
        <h2 className="font-display uppercase text-sm text-score-amber tracking-wide">
          한국인 해외파 트래커
        </h2>
        <span className="text-[10px] text-floodlight/30 ml-1">5대 리그 + 손흥민</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {players.map((p) => {
          // 현재 소속팀 스탯 우선 (클럽 리그), 없으면 첫번째
          const clubStat = p.statistics.find(
            (s) => !["World Cup - Qualification Asia", "FIFA World Cup", "AFC Asian Cup"].some(
              (wc) => s.league.name.includes("World Cup") || s.league.name.includes("AFC") || s.league.name.includes("Asian")
            )
          )
          const stat = clubStat ?? p.statistics[0]
          if (!stat) return null

          const goals = stat.goals.total ?? 0
          const assists = stat.goals.assists ?? 0
          const apps = stat.games.appearences ?? 0
          const starts = stat.games.lineups ?? 0
          const minutes = stat.games.minutes ?? 0
          const yellowCards = stat.cards?.yellow ?? 0
          const shots = stat.shots?.total ?? 0
          const shotsOn = stat.shots?.on ?? 0
          const passes = stat.passes?.accuracy ?? null
          const dribbles = stat.dribbles?.success ?? null
          const lastMatch = formatLastMatch(p.lastMatchDate)

          return (
            <Link
              key={p.player.id}
              href={`/players/${p.player.id}`}
              className="shrink-0 w-56 bg-turf/40 border-l-2 border-score-amber p-3 hover:bg-turf-line/30 transition-colors"
            >
              {/* 상단: 사진 + 이름 + 소속팀 */}
              <div className="flex items-center gap-2.5 mb-2.5">
                <PlayerAvatar
                  src={p.player.photo}
                  alt={p.player.name}
                  className="w-12 h-12 rounded-full bg-turf-line object-cover shrink-0 text-xs"
                />
                <div className="flex-1 min-w-0">
                  {/* 이름 — 길면 줄여서 2줄까지 */}
                  <p className="text-sm font-bold text-floodlight leading-tight line-clamp-2">
                    {p.player.name}
                  </p>
                  {/* 현재 소속팀 — 골드색, 눈에 띄게 */}
                  <div className="flex items-center gap-1 mt-0.5">
                    <img src={stat.team.logo} alt="" className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] font-semibold text-score-amber truncate">
                      {stat.team.name}
                    </span>
                  </div>
                  {/* 리그명 */}
                  <p className="text-[10px] text-floodlight/35 truncate mt-0.5">
                    {stat.league.name}
                  </p>
                </div>
              </div>

              {/* 평점 + 최근 경기 날짜 */}
              <div className="flex items-center justify-between mb-2">
                <RatingBadge rating={stat.games.rating} />
                {lastMatch && (
                  <span className="text-[10px] text-floodlight/35">최근 {lastMatch}</span>
                )}
              </div>

              {/* 구분선 */}
              <div className="border-t border-turf-line/30 my-2" />

              {/* 주요 스탯 */}
              <div className="grid grid-cols-3 gap-y-1.5 text-center mb-2">
                <div>
                  <p className="text-sm font-bold text-score-amber font-data">{goals}</p>
                  <p className="text-[9px] text-floodlight/40">득점</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-floodlight font-data">{assists}</p>
                  <p className="text-[9px] text-floodlight/40">도움</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-floodlight font-data">{apps}</p>
                  <p className="text-[9px] text-floodlight/40">출전</p>
                </div>
              </div>

              {/* 세부 스탯 */}
              <div className="space-y-0.5">
                {minutes > 0 && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-floodlight/40">출전 시간</span>
                    <span className="text-floodlight/70 font-data">{minutes.toLocaleString()}분</span>
                  </div>
                )}
                {starts > 0 && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-floodlight/40">선발</span>
                    <span className="text-floodlight/70 font-data">{starts}경기</span>
                  </div>
                )}
                {shots > 0 && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-floodlight/40">슈팅 (유효)</span>
                    <span className="text-floodlight/70 font-data">{shots} ({shotsOn})</span>
                  </div>
                )}
                {passes !== null && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-floodlight/40">패스 정확도</span>
                    <span className="text-floodlight/70 font-data">{passes}%</span>
                  </div>
                )}
                {dribbles !== null && dribbles > 0 && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-floodlight/40">드리블 성공</span>
                    <span className="text-floodlight/70 font-data">{dribbles}</span>
                  </div>
                )}
                {yellowCards > 0 && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-floodlight/40">경고</span>
                    <span className="text-score-amber font-data">🟨 {yellowCards}</span>
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
