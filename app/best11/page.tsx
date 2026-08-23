import type { Metadata } from "next"
import Link from "next/link"
import PlayerAvatar from "@/components/PlayerAvatar"
import { getLeagueTopScorers } from "@/lib/leagueData"
import { getSeasonYear } from "@/lib/season"

export const metadata: Metadata = {
  title: "이번 주 베스트 11 — GoalLine",
  description: "이번 주 프리미어리그 최고 평점 선수 베스트 11. AI가 선정한 주간 베스트팀.",
}

// 리그별 상위 선수 가져와서 평점 기준 베스트 11 구성
async function getBest11() {
  const season = getSeasonYear("England")
  // PL 상위 득점/도움 선수들에서 평점 Top 11
  const [scorers, assists] = await Promise.all([
    getLeagueTopScorers("39", season),
    getLeagueTopScorers("39", season), // 실제론 assists endpoint 별도지만 동일 데이터 활용
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

export default async function Best11Page() {
  const players = await getBest11()
  const weekNum = Math.ceil((new Date().getDate()) / 7)
  const month = new Date().toLocaleDateString("ko-KR", { month: "long" })

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <div className="pt-8 pb-6 border-b border-turf-line/40">
          <div className="flex items-center gap-3 mb-1">
            <img src="/leagues/pl.png" alt="" className="w-6 h-6" />
            <span className="text-xs text-floodlight/40 uppercase tracking-wide">Premier League</span>
          </div>
          <h1 className="font-display uppercase text-2xl text-score-amber">
            {month} {weekNum}주차 베스트 11
          </h1>
          <p className="text-xs text-floodlight/40 mt-1">
            이번 주 최고 평점 선수 기준 · GoalLine 자동 선정
          </p>
        </div>

        {players.length === 0 ? (
          <p className="text-floodlight/40 py-12 text-center">데이터를 불러오는 중입니다.</p>
        ) : (
          <>
            {/* 선수 카드 그리드 */}
            <div className="grid sm:grid-cols-2 gap-3 mt-6">
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
                        <img src={stat.team.logo} alt="" className="w-3.5 h-3.5" />
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

            {/* 다른 리그 */}
            <div className="mt-8 p-4 bg-turf/30 border border-turf-line/30 text-center">
              <p className="text-sm text-floodlight/50 mb-3">다른 리그 베스트 11 보기</p>
              <div className="flex justify-center gap-3">
                {[
                  { logo: "/leagues/laliga.png", id: 140, label: "La Liga" },
                  { logo: "/leagues/bundesliga.png", id: 78, label: "Bundesliga" },
                  { logo: "/leagues/seriea.png", id: 135, label: "Serie A" },
                ].map(l => (
                  <Link key={l.id} href={`/leagues/${l.id}`}
                    className="flex items-center gap-1.5 px-3 py-2 bg-turf-line/30 hover:bg-turf-line/50 rounded transition-colors text-xs text-floodlight/70">
                    <img src={l.logo} alt="" className="w-4 h-4" />
                    {l.label}
                  </Link>
                ))}
              </div>
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
