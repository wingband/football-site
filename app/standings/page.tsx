import type { Metadata } from "next"
import Link from "next/link"
import { getSeasonYear } from "@/lib/season"
import { getLeagueStandings } from "@/lib/leagueData"

export const metadata: Metadata = {
  title: "2026-27 유럽 축구 리그 순위표 — 프리미어리그·라리가·분데스리가 | GoalLine",
  description: "2026-27 시즌 프리미어리그, 라리가, 분데스리가, 세리에A, 리그1 순위표를 한눈에 확인하세요. 매일 업데이트.",
  keywords: ["프리미어리그 순위", "라리가 순위", "분데스리가 순위", "세리에A 순위", "리그1 순위", "유럽 축구 순위표"],
}

const LEAGUES = [
  { id: 39,  name: "프리미어리그", nameEn: "Premier League", country: "England", logo: "/leagues/pl.png" },
  { id: 140, name: "라리가",       nameEn: "La Liga",        country: "Spain",   logo: "/leagues/laliga.png" },
  { id: 78,  name: "분데스리가",   nameEn: "Bundesliga",     country: "Germany", logo: "/leagues/bundesliga.png" },
  { id: 135, name: "세리에A",      nameEn: "Serie A",        country: "Italy",   logo: "/leagues/seriea.png" },
  { id: 61,  name: "리그1",        nameEn: "Ligue 1",        country: "France",  logo: "/leagues/ligue1.png" },
]

function qualColor(desc: string | null | undefined) {
  if (!desc) return ""
  const d = desc.toLowerCase()
  if (d.includes("champions league")) return "bg-blue-500"
  if (d.includes("europa")) return "bg-orange-400"
  if (d.includes("conference")) return "bg-green-500"
  if (d.includes("relegation")) return "bg-red-600"
  return ""
}

function FormBadge({ result }: { result: string }) {
  const colors: Record<string, string> = {
    W: "bg-green-600 text-white",
    D: "bg-turf-line/60 text-floodlight/60",
    L: "bg-red-700 text-white",
  }
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-sm text-[9px] font-bold ${colors[result] ?? "bg-turf-line/30"}`}>
      {result}
    </span>
  )
}

async function getStandingsData(leagueId: number, season: number) {
  const data = await getLeagueStandings(String(leagueId), season)
  if (!data) return null
  return data
}

export default async function StandingsPage() {
  const season = getSeasonYear("England")

  const allData = await Promise.all(
    LEAGUES.map(async (l) => {
      let data = await getStandingsData(l.id, season)
      if (!data) data = await getStandingsData(l.id, season - 1)
      return { ...l, data }
    })
  )

  const week = Math.ceil(new Date().getDate() / 7)
  const monthName = new Date().toLocaleDateString("ko-KR", { month: "long" })

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="pt-8 pb-4 border-b border-turf-line/40 mb-6">
          <h1 className="font-display uppercase text-xl text-score-amber">
            {season}-{String(season + 1).slice(2)} 리그 순위표
          </h1>
          <p className="text-xs text-floodlight/40 mt-1">
            {monthName} {week}주차 기준 · 매일 업데이트
          </p>
        </div>

        {/* 리그 탭 */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 [scrollbar-width:none]">
          {LEAGUES.map(l => (
            <a key={l.id} href={`#league-${l.id}`}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-turf-line/30 hover:bg-turf-line/50 rounded-full text-xs text-floodlight/70 hover:text-floodlight transition-colors">
              <img src={l.logo} alt="" className="w-4 h-4" />
              {l.name}
            </a>
          ))}
        </div>

        {/* 각 리그 순위표 */}
        <div className="space-y-10">
          {allData.map(({ id, name, nameEn, logo, data }) => {
            if (!data) return null
            const standings = data.league.standings
            if (!standings?.length) return null

            return (
              <section key={id} id={`league-${id}`}>
                {/* 리그 헤더 */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <img src={logo} alt="" className="w-7 h-7" />
                    <div>
                      <h2 className="font-display uppercase text-base text-floodlight font-bold">{name}</h2>
                      <p className="text-[10px] text-floodlight/30">{nameEn} {data.league.season}</p>
                    </div>
                  </div>
                  <Link href={`/leagues/${id}`}
                    className="text-xs text-score-amber hover:underline">
                    전체 보기 →
                  </Link>
                </div>

                {/* 순위표 */}
                {standings.map((group, gi) => (
                  <div key={gi} className={standings.length > 1 ? "mb-4" : ""}>
                    {standings.length > 1 && (
                      <p className="text-xs text-floodlight/40 px-2 py-1.5 bg-turf-line/20 mb-1">
                        {group[0]?.group}
                      </p>
                    )}
                    <div className="bg-turf/30 border border-turf-line/30 overflow-hidden">
                      {/* 컬럼 헤더 */}
                      <div className="grid grid-cols-[24px_1fr_32px_32px_32px_32px_40px_48px_80px] gap-1 px-3 py-2 text-[10px] text-floodlight/30 uppercase border-b border-turf-line/20">
                        <span>#</span>
                        <span>팀</span>
                        <span className="text-center">경기</span>
                        <span className="text-center hidden sm:block">승</span>
                        <span className="text-center hidden sm:block">무</span>
                        <span className="text-center hidden sm:block">패</span>
                        <span className="text-center">+/-</span>
                        <span className="text-center font-bold">승점</span>
                        <span className="text-center hidden sm:block">최근 5경기</span>
                      </div>

                      {/* 팀 행 */}
                      {group.slice(0, 20).map((row, idx) => {
                        const color = qualColor(row.description)
                        const form = (row.form ?? "").split("").slice(-5)

                        return (
                          <Link key={row.team.id} href={`/teams/${row.team.id}`}
                            className={`grid grid-cols-[24px_1fr_32px_32px_32px_32px_40px_48px_80px] gap-1 px-3 py-2.5 items-center text-sm border-b border-turf-line/20 last:border-b-0 hover:bg-turf-line/20 transition-colors ${idx < 3 ? "bg-turf/20" : ""}`}>

                            {/* 순위 */}
                            <span className="flex items-center gap-1">
                              <span className={`w-[3px] h-4 rounded-full shrink-0 ${color || "bg-transparent"}`} />
                              <span className="text-floodlight/50 font-data text-xs">{row.rank}</span>
                            </span>

                            {/* 팀명 */}
                            <span className="flex items-center gap-2 min-w-0">
                              <img src={row.team.logo} alt="" className="w-5 h-5 shrink-0" />
                              <span className="truncate text-xs font-medium">{row.team.name}</span>
                            </span>

                            <span className="text-center text-xs text-floodlight/60 font-data">{row.all.played}</span>
                            <span className="text-center text-xs text-floodlight/50 font-data hidden sm:block">{row.all.win}</span>
                            <span className="text-center text-xs text-floodlight/50 font-data hidden sm:block">{row.all.draw}</span>
                            <span className="text-center text-xs text-floodlight/50 font-data hidden sm:block">{row.all.lose}</span>
                            <span className="text-center text-xs text-floodlight/60 font-data">
                              {row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}
                            </span>
                            <span className="text-center text-sm font-bold font-data text-floodlight">{row.points}</span>

                            {/* 최근 5경기 폼 */}
                            <span className="hidden sm:flex justify-center gap-0.5">
                              {form.map((r, i) => <FormBadge key={i} result={r} />)}
                            </span>
                          </Link>
                        )
                      })}
                    </div>

                    {/* 범례 */}
                    {gi === 0 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 px-1">
                        {[
                          { color: "bg-blue-500", label: "챔피언스리그" },
                          { color: "bg-orange-400", label: "유로파리그" },
                          { color: "bg-green-500", label: "컨퍼런스리그" },
                          { color: "bg-red-600", label: "강등권" },
                        ].map(l => (
                          <div key={l.label} className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${l.color}`} />
                            <span className="text-[10px] text-floodlight/30">{l.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </section>
            )
          })}
        </div>

        {/* SEO 텍스트 */}
        <section className="mt-12 pt-8 border-t border-turf-line/30">
          <h2 className="font-semibold text-sm text-floodlight/60 mb-2">유럽 축구 리그 순위표 안내</h2>
          <p className="text-xs text-floodlight/40 leading-relaxed">
            본 페이지에서는 {season}-{season + 1} 시즌 프리미어리그(잉글랜드), 라리가(스페인),
            분데스리가(독일), 세리에A(이탈리아), 리그1(프랑스) 순위표를 제공합니다.
            각 팀의 경기수, 승·무·패, 득실차, 승점과 최근 5경기 폼을 확인할 수 있습니다.
            리그 로고 또는 팀명을 클릭하면 상세 정보 페이지로 이동합니다.
          </p>
        </section>
      </div>
    </main>
  )
}
