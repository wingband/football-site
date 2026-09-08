import TeamHeader from "@/components/TeamHeader"
import AdSlot from "@/components/AdSlot"
import { getTeamInfo } from "@/lib/teamData"

// 팀 페이지 전체(개요/순위/경기/스쿼드/...)가 공유하는 레이아웃.
// 헤더+탭을 여기서 한 번만 렌더링해서, 탭 클릭할 때마다 메뉴 위치가 흔들리던 문제를 근본적으로 해결
//
// (2026-09-08) 스코프 기반 404 차단을 제거함. 유명하지 않은 팀(Willem II 등)이
// 정상적인 내부 링크를 통해 접근돼도 여기서 막혀버려 실제 사용자 탐색이 광범위하게
// 깨지는 문제가 있었다. 봇의 대량 스캔 방어는 middleware.ts의 분당 40회
// 레이트리밋으로 넘긴다 (app/teams/[id]/page.tsx와 동일한 조치, 원래 이중 방어로
// 여기도 같이 넣어뒀던 걸 그때는 놓쳤었음)
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
