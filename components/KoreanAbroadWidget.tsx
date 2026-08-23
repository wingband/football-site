import Link from "next/link"
import PlayerAvatar from "@/components/PlayerAvatar"
import { KOREAN_PLAYERS_ABROAD, type KoreanPlayer } from "@/lib/koreanPlayersAbroad"
import { saveCachedPlayerStat, getCachedPlayerStat, type CachedPlayerStat } from "@/lib/playerStatCache"

// API 응답에서 클럽 스탯만 추출 (국대/친선 제외)
const NATIONAL_KW = ["World Cup", "AFC", "Asian", "Olympic", "Friendlies", "Qualification", "Nations", "Copa America", "EURO"]

function getClubStat(data: CachedPlayerStat) {
  const club = data.statistics.find(
    (s) => !NATIONAL_KW.some((kw) => s.league.name.includes(kw))
  )
  return club ?? null
}

async function fetchStat(playerId: number, season: number, useCache: boolean) {
  const res = await fetch(
    `https://v3.football.api-sports.io/players?id=${playerId}&season=${season}`,
    {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      ...(useCache ? { next: { revalidate: 600 } } : { cache: "no-store" as const }),
    }
  )
  return res.json()
}

async function getPlayerStat(playerId: number, season: number): Promise<CachedPlayerStat | null> {
  let data = await fetchStat(playerId, season, true)
  if (!data.response?.[0]) {
    await new Promise((r) => setTimeout(r, 300))
    data = await fetchStat(playerId, season, false)
  }
  const fresh: CachedPlayerStat | null = data.response?.[0] ?? null
  if (fresh) { await saveCachedPlayerStat(playerId, fresh) }
  return fresh ?? getCachedPlayerStat(playerId)
}

type EnrichedPlayer = KoreanPlayer & {
  goals: number
  assists: number
  apps: number
  minutes: number
  rating: string | null
  shots: number
  shotsOn: number
  passAccuracy: number | null
}

async function getAllPlayers(): Promise<EnrichedPlayer[]> {
  const season = new Date().getFullYear()
  const results = await Promise.all(
    KOREAN_PLAYERS_ABROAD.map(async (player) => {
      const raw = await getPlayerStat(player.id, season)
      const stat = raw ? getClubStat(raw) : null
      return {
        ...player,
        goals: stat?.goals.total ?? 0,
        assists: stat?.goals.assists ?? 0,
        apps: stat?.games.appearences ?? 0,
        minutes: stat?.games.minutes ?? 0,
        rating: stat?.games.rating ?? null,
        shots: stat?.shots?.total ?? 0,
        shotsOn: stat?.shots?.on ?? 0,
        passAccuracy: stat?.passes?.accuracy ?? null,
      }
    })
  )
  return results
}

function RatingBadge({ rating }: { rating: string | null }) {
  if (!rating) return null
  const n = parseFloat(rating)
  const cls = n >= 7.5 ? "bg-green-600" : n >= 6.5 ? "bg-orange-500" : "bg-red-700"
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white font-data ${cls}`}>{n.toFixed(2)}</span>
}

function PlayerCard({ p }: { p: EnrichedPlayer }) {
  return (
    <Link
      href={`/players/${p.id}`}
      className="shrink-0 w-48 bg-turf/40 border-l-2 border-score-amber p-3 hover:bg-turf-line/30 transition-colors flex flex-col gap-2"
    >
      {/* 선수 사진 + 이름 + 팀 */}
      <div className="flex items-center gap-2.5">
        <PlayerAvatar
          src={`https://media.api-sports.io/football/players/${p.id}.png`}
          alt={p.name}
          className="w-11 h-11 rounded-full bg-turf-line object-cover shrink-0 text-xs"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-floodlight leading-tight truncate">{p.name}</p>
          {/* 현재 소속팀 — 하드코딩으로 항상 정확하게 표시 */}
          <div className="flex items-center gap-1 mt-0.5">
            <img src={p.teamLogo} alt="" className="w-3.5 h-3.5 shrink-0" />

            <span className="text-[11px] font-semibold text-score-amber truncate">{p.teamName}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <img src={p.leagueLogo} alt="" className="w-3 h-3 shrink-0 brightness-125" />
            <span className="text-[9px] text-floodlight/35 truncate">{p.league}</span>
          </div>
        </div>
      </div>

      {/* 평점 */}
      <div className="flex items-center justify-between">
        <RatingBadge rating={p.rating} />
        {p.apps > 0 && <span className="text-[9px] text-floodlight/30">{p.apps}경기</span>}
      </div>

      {/* 핵심 스탯 */}
      <div className="border-t border-turf-line/30 pt-1.5 grid grid-cols-3 text-center">
        <div>
          <p className="text-sm font-bold text-score-amber font-data">{p.goals}</p>
          <p className="text-[9px] text-floodlight/40">득점</p>
        </div>
        <div>
          <p className="text-sm font-bold text-floodlight font-data">{p.assists}</p>
          <p className="text-[9px] text-floodlight/40">도움</p>
        </div>
        <div>
          <p className="text-sm font-bold text-floodlight font-data">{p.minutes > 0 ? p.minutes.toLocaleString() : "-"}</p>
          <p className="text-[9px] text-floodlight/40">출전분</p>
        </div>
      </div>

      {/* 추가 스탯 */}
      <div className="space-y-0.5">
        {p.shots > 0 && (
          <div className="flex justify-between text-[9px]">
            <span className="text-floodlight/35">슈팅(유효)</span>
            <span className="text-floodlight/60 font-data">{p.shots}({p.shotsOn})</span>
          </div>
        )}
        {p.passAccuracy !== null && (
          <div className="flex justify-between text-[9px]">
            <span className="text-floodlight/35">패스 정확도</span>
            <span className="text-floodlight/60 font-data">{p.passAccuracy}%</span>
          </div>
        )}
      </div>
    </Link>
  )
}

export default async function KoreanAbroadWidget() {
  const players = await getAllPlayers()

  const tier1 = players.filter((p) => p.tier === 1)
  const tier2 = players.filter((p) => p.tier === 2)

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <span className="text-base">🇰🇷</span>
        <h2 className="font-display uppercase text-sm text-score-amber tracking-wide">
          한국인 해외파 트래커
        </h2>
      </div>

      {/* 1부 리그 선수 */}
      {tier1.length > 0 && (
        <div>
          <p className="text-[10px] text-floodlight/30 uppercase tracking-wide mb-2">5대 리그 1부</p>
          <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tier1.map((p) => <PlayerCard key={p.id} p={p} />)}
          </div>
        </div>
      )}

      {/* 기타 선수 (Championship, MLS 등) */}
      {tier2.length > 0 && (
        <div>
          <p className="text-[10px] text-floodlight/30 uppercase tracking-wide mb-2">주목 선수</p>
          <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tier2.map((p) => <PlayerCard key={p.id} p={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}
