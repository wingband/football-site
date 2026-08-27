export const dynamic = 'force-dynamic'

import type { Metadata } from "next"
import Link from "next/link"
import PlayerAvatar from "@/components/PlayerAvatar"
import { getLeagueTopScorers, getLeagueTopAssists } from "@/lib/leagueData"
import { getSeasonYear } from "@/lib/season"
import Logo from "@/components/Logo"

const LEAGUES = [
  { id: 39,  name: "프리미어리그", nameEn: "Premier League", country: "England",     logo: "/leagues/pl.png" },
  { id: 140, name: "라리가",       nameEn: "La Liga",        country: "Spain",       logo: "/leagues/laliga.png" },
  { id: 78,  name: "분데스리가",   nameEn: "Bundesliga",     country: "Germany",     logo: "/leagues/bundesliga.png" },
  { id: 135, name: "세리에A",      nameEn: "Serie A",        country: "Italy",       logo: "/leagues/seriea.png" },
  { id: 61,  name: "리그1",        nameEn: "Ligue 1",        country: "France",      logo: "/leagues/ligue1.png" },
  { id: 292, name: "K리그",        nameEn: "K League 1",     country: "South Korea", logo: "/leagues/kleague.png" },
]

// ?league= 값 검증. 목록에 없는 값(오타 등)이면 프리미어리그로 되돌린다
function resolveLeague(raw: string | undefined) {
  const requested = Number(raw)
  return LEAGUES.find(l => l.id === requested) ?? LEAGUES[0]
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>
}): Promise<Metadata> {
  const league = resolveLeague((await searchParams).league)

  return {
    title: `이번 주 ${league.name} 베스트 11 — GoalLine`,
    description: `이번 주 ${league.name} 최고 평점 선수 베스트 11. 주간 베스트팀을 확인하세요.`,
  }
}

// 리그별 상위 선수 가져와서 평점 기준 베스트 11 구성
async function getBest11(leagueId: number, season: number) {
  const [scorers, assists] = await Promise.all([
    getLeagueTopScorers(String(leagueId), season),
    getLeagueTopAssists(String(leagueId), season),
  ])

  const pool = new Map()
  for (const s of [...scorers, ...assists]) {
    if (!pool.has(s.player.id)) pool.set(s.player.id, s)
  }

  const ranked = [...pool.values()]
    .filter(s => s.statistics[0]?.games?.rating)
    .sort((a, b) => Number(b.statistics[0].games.rating) - Number(a.statistics[0].games.rating))
    .slice(0, 11)

  return ranked
}

const POSITIONS = ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "CAM", "RW", "ST", "LW"]

function RatingBadge({ rating }: { rating: string }) {
  const n = parseFloat(rating)
  const bg = n >= 8 ? "bg-green-600" : n >= 7 ? "bg-green-700" : "bg-orange-500"
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold text-white font-data ${bg}`}>
      {n.toFixed(2)}
    </span>
  )
}

export default async function Best11Page({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>
}) {
  const league = resolveLeague((await searchParams).league)
  const season = getSeasonYear(league.country)
  const players = await getBest11(league.id, season)
  const weekNum = Math.ceil((new Date().getDate()) / 7)
  const month = new Date().toLocaleDateString("ko-KR", { month: "long" })

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <div className="pt-8 pb-6 border-b border-turf-line/40">
          <h1 className="font-display uppercase text-2xl text-score-amber">
            {month} {weekNum}주차 베스트 11
          </h1>
          <p className="text-xs text-floodlight/40 mt-1">
            이번 주 최고 평점 선수 기준 · GoalLine 자동 선정
          </p>
        </div>

        {/* 리그 탭 */}
        <div className="flex gap-2 overflow-x-auto py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {LEAGUES.map(l => (
            <Link
              key={l.id}
              href={l.id === LEAGUES[0].id ? "/best11" : `/best11?league=${l.id}`}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors ${
                l.id === league.id
                  ? "bg-score-amber text-pitch-night font-bold"
                  : "bg-turf-line/30 text-floodlight/60 hover:text-floodlight hover:bg-turf-line/50"
              }`}
            >
              <Logo src={l.logo} alt="" className="w-4 h-4" />
              {l.name}
            </Link>
          ))}
        </div>

        {players.length === 0 ? (
          <p className="text-floodlight/40 py-12 text-center">데이터를 불러오는 중입니다.</p>
        ) : (
          <>
            {/* 선수 카드 그리드 */}
            <div className="grid sm:grid-cols-2 gap-3 mt-2">
              {players.map((p, i) => {
                const stat = p.statistics[0]
                const pos = POSITIONS[i] ?? "MF"
                return (
                  <Link
                    key={p.player.id}
                    href={`/players/${p.player.id}`}
                    className="flex items-center gap-3 bg-turf/40 border border-turf-line/40 p-4 hover:border-score-amber/50 hover:bg-turf-line/20 transition-colors group"
                  >
                    {/* 순위 */}
                    <span className="text-score-amber font-display text-xl w-6 text-center shrink-0">
                      {i + 1}
                    </span>

                    {/* 사진 */}
                    <PlayerAvatar
                      src={p.player.photo}
                      alt={p.player.name}
                      className="w-12 h-12 rounded-full object-cover bg-turf-line shrink-0"
                    />

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-turf-line/60 text-floodlight/60 px-1.5 py-0.5 rounded font-data font-bold">
                          {pos}
                        </span>
                        <p className="text-sm font-semibold group-hover:text-score-amber transition-colors truncate">
                          {p.player.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Logo src={stat.team.logo} alt="" className="w-3.5 h-3.5" />
                        <span className="text-xs text-floodlight/50 truncate">{stat.team.name}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-floodlight/50">
                        <span>⚽ {stat.goals.total ?? 0}</span>
                        <span>🅰️ {stat.goals.assists ?? 0}</span>
                        <span>{stat.games.appearences ?? 0}경기</span>
                      </div>
                    </div>

                    {/* 평점 */}
                    <div className="shrink-0">
                      <RatingBadge rating={stat.games.rating} />
                      <p className="text-[9px] text-floodlight/30 text-center mt-1">평점</p>
                    </div>
                  </Link>
                )
              })}
            </div>

            <p className="text-[10px] text-floodlight/25 mt-6 text-center">
              * 시즌 누적 평점 기준 · API-Football 제공 데이터
            </p>
          </>
        )}
      </div>
    </main>
  )
}
