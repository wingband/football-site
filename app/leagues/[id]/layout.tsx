import LeagueHeader from "@/components/LeagueHeader"
import AdSlot from "@/components/AdSlot"
import { getSeasonYear } from "@/lib/season"
import { getLeagueStandings } from "@/lib/leagueData"

// 리그 페이지 전체(개요/순위/경기/득점순위/뉴스)가 공유하는 레이아웃.
// 헤더+탭을 한 번만 렌더링해서 탭 이동 시 메뉴가 흔들리던 문제를 해결
export default async function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const euroSeason = getSeasonYear("England")
  let data = await getLeagueStandings(id, euroSeason)
  if (!data) data = await getLeagueStandings(id, new Date().getFullYear())

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-4xl mx-auto pb-16 px-4">
        {data ? (
          <LeagueHeader
            leagueId={id}
            name={data.league.name}
            country={data.league.country}
            logo={data.league.logo}
            season={data.league.season}
          />
        ) : (
          <p className="text-floodlight/40 pt-8">리그 정보를 찾을 수 없습니다.</p>
        )}
        <AdSlot label="리그 페이지 배너 광고 (예: 728x90)" className="w-full h-16 mb-6" />
        {children}
      </div>
    </main>
  )
}
