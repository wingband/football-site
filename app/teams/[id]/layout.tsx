import { notFound } from "next/navigation"
import TeamHeader from "@/components/TeamHeader"
import AdSlot from "@/components/AdSlot"
import { getTeamInfo, getTeamCurrentLeague } from "@/lib/teamData"
import { isTeamInScope } from "@/lib/scope"

// 팀 페이지 전체(개요/순위/경기/스쿼드/...)가 공유하는 레이아웃.
// 헤더+탭을 여기서 한 번만 렌더링해서, 탭 클릭할 때마다 메뉴 위치가 흔들리던 문제를 근본적으로 해결
//
// 스코프 체크도 여기서 한 곳에서 처리한다: 관심 리그/국가대표팀이 아닌 팀 ID는
// 하위 8개 라우트(개요/경기/뉴스/기록/이적/선수통계/스쿼드/순위표) 중 어디로 들어와도
// 여기서 즉시 404 처리돼서 각 라우트가 저마다 API를 호출하기 전에 차단된다.
// (봇이 순차적인 팀 ID를 훑을 때 팀당 5~6콜씩 나가던 쿼터 소진의 핵심 원인, 2026-09-07 확인)
export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const info = await getTeamInfo(id)

  if (!info) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
        <div className="max-w-4xl mx-auto pb-16 px-4">
          <p className="text-floodlight/40 pt-8">팀 정보를 찾을 수 없습니다.</p>
        </div>
      </main>
    )
  }

  const teamLeague = await getTeamCurrentLeague(id)
  if (!isTeamInScope(teamLeague?.id, info.team.name)) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-4xl mx-auto pb-16 px-4">
        <TeamHeader teamId={id} name={info.team.name} country={info.team.country} logo={info.team.logo} />
        <AdSlot label="팀 페이지 배너 광고 (예: 728x90)" className="w-full h-16 mb-6" />
        {children}
      </div>
    </main>
  )
}
