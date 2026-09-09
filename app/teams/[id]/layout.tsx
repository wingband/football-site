import { notFound } from "next/navigation"
import { headers } from "next/headers"
import TeamHeader from "@/components/TeamHeader"
import AdSlot from "@/components/AdSlot"
import { getTeamInfo, getTeamCurrentLeague } from "@/lib/teamData"
import { isTeamInScope, isInternalReferer } from "@/lib/scope"

// 팀 페이지 전체(개요/순위/경기/스쿼드/...)가 공유하는 레이아웃.
// 헤더+탭을 여기서 한 번만 렌더링해서, 탭 클릭할 때마다 메뉴 위치가 흔들리던 문제를 근본적으로 해결
//
// (2026-09-08) 스코프 기반 404 차단을 한 번 완전히 제거했었는데, 바로 다음 날
// 팀 ID를 순차적으로 훑는 스캐너가 나타나 팀당 5콜씩(심지어 스쿼드/팀통계까지)
// API를 소진하는 게 확인됐다 (2026-09-09). 그렇다고 완전 재차단하면 실제 사용자의
// 선수 페이지 -> 팀 페이지 링크가 다시 깨지므로, "우리 사이트에서 클릭해서 온 요청인지"로
// 나눈다. Referer만으론 클라이언트 사이드 라우팅에서 신뢰할 수 없어서, 우리 사이트의
// 모든 팀 링크에 ?ref=internal을 붙이고 미들웨어가 이걸 커스텀 헤더로 넘겨준다
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
  const inScope = isTeamInScope(teamLeague?.id, info.team.name)

  if (!inScope) {
    const hdrs = await headers()
    // 미들웨어가 ?ref=internal 쿼리를 보고 세팅해준 헤더가 1차 판단 기준.
    // Referer는 브라우저/네비게이션 방식에 따라 안 잡힐 때가 있어서 보조 신호로만 쓴다
    const hasInternalRefHeader = hdrs.get("x-team-ref-internal") === "1"
    const referer = hdrs.get("referer")
    if (!hasInternalRefHeader && !isInternalReferer(referer)) {
      notFound()
    }
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
