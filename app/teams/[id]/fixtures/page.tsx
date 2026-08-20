import Link from "next/link"
import type { Metadata } from "next"
import TeamHeader from "@/components/TeamHeader"
import { getTeamInfo, getTeamCurrentLeague, getTeamSeasonFixtures, type TeamFixture } from "@/lib/teamData"

const FINISHED_CODES = ["FT", "AET", "PEN"]

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const info = await getTeamInfo(id)
  if (!info) return { title: "경기 일정" }
  return { title: `${info.team.name} 경기 일정`, description: `${info.team.name}의 시즌 전체 경기 일정과 결과.` }
}

export default async function TeamFixturesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const info = await getTeamInfo(id)
  if (!info) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
        <p className="text-floodlight/40">팀 정보를 찾을 수 없습니다.</p>
      </main>
    )
  }

  const teamLeague = await getTeamCurrentLeague(id)
  const season = teamLeague?.season ?? new Date().getFullYear()
  const fixtures = await getTeamSeasonFixtures(id, season)

  const sorted = [...fixtures].sort(
    (a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
  )
  const groups = new Map<string, TeamFixture[]>()
  for (const fx of sorted) {
    const key = new Date(fx.fixture.date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    })
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(fx)
  }

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-3xl mx-auto pb-16 px-4">
        <TeamHeader teamId={id} name={info.team.name} country={info.team.country} logo={info.team.logo} active="fixtures" />

        {sorted.length === 0 && <p className="text-floodlight/40 text-sm py-6">경기 일정 정보가 없습니다.</p>}

        {[...groups.entries()].map(([date, list]) => (
          <div key={date} className="mb-2">
            <div className="flex items-center justify-between px-4 py-2.5 bg-turf-line/30 rounded">
              <p className="text-sm text-floodlight/70 font-medium">{date}</p>
              {list[0]?.league?.name && (
                <span className="text-xs text-floodlight/40">{list[0].league.name}</span>
              )}
            </div>
            {list.map((fx) => {
              const finished = FINISHED_CODES.includes(fx.fixture.status.short)
              const timeText = new Date(fx.fixture.date).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
              const isOwnHome = fx.teams.home.id === info.team.id
              const own = isOwnHome ? fx.goals.home : fx.goals.away
              const opp = isOwnHome ? fx.goals.away : fx.goals.home
              const scoreColor =
                !finished || own === null || opp === null
                  ? "bg-turf-line/50 text-score-amber"
                  : own > opp
                    ? "bg-green-600 text-white"
                    : own < opp
                      ? "bg-red-500/80 text-white"
                      : "bg-floodlight/30 text-floodlight"

              return (
                <Link
                  key={fx.fixture.id}
                  href={`/matches/${fx.fixture.id}`}
                  className="flex items-center justify-center gap-3 px-4 py-4 text-sm hover:bg-turf-line/20 border-b border-turf-line/20 last:border-b-0"
                >
                  <span className="flex-1 text-right truncate">{fx.teams.home.name}</span>
                  <img src={fx.teams.home.logo} alt="" className="w-5 h-5 shrink-0" />
                  <span className={`font-data w-16 text-center shrink-0 rounded px-1 py-0.5 ${scoreColor}`}>
                    {finished ? `${fx.goals.home} - ${fx.goals.away}` : timeText}
                  </span>
                  <img src={fx.teams.away.logo} alt="" className="w-5 h-5 shrink-0" />
                  <span className="flex-1 truncate">{fx.teams.away.name}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </div>
    </main>
  )
}
