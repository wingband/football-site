import LeagueHeader from "@/components/LeagueHeader"
import AdSlot from "@/components/AdSlot"
import { getSeasonYear } from "@/lib/season"
import { getLeagueStandings } from "@/lib/leagueData"
import { checkApiFootballStatus } from "@/lib/apiFootballStatus"

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
  const thisYear = new Date().getFullYear()
  // 여러 시즌 순서로 시도 (CL 등 일부 리그는 연도가 다를 수 있음).
  // thisYear가 euroSeason과 같으면(7~12월) 중복 호출이라 건너뛴다
  let data = await getLeagueStandings(id, euroSeason)
  if (!data && thisYear !== euroSeason) data = await getLeagueStandings(id, thisYear)
  if (!data) data = await getLeagueStandings(id, euroSeason - 1)

  // 순위표를 끝내 못 가져왔으면 API-Football 쿼터/키 상태를 조회해서 진짜 이유를 보여준다.
  // /status는 쿼터를 소모하지 않으므로 실패 시에만 추가로 불러도 안전하다
  const apiStatus = data ? null : await checkApiFootballStatus()

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
          <div className="pt-8">
            <p className="text-floodlight/40">리그 정보를 찾을 수 없습니다.</p>
            {apiStatus && !apiStatus.ok && (
              <p className="text-floodlight/25 text-xs mt-1.5">
                원인: {apiStatus.message}
              </p>
            )}
          </div>
        )}
        <AdSlot label="리그 페이지 배너 광고 (예: 728x90)" className="w-full h-16 mb-6" />
        {children}
      </div>
    </main>
  )
}
