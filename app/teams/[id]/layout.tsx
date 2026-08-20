import TeamHeader from "@/components/TeamHeader"
import AdSlot from "@/components/AdSlot"
import { getTeamInfo } from "@/lib/teamData"

// 팀 페이지 전체(개요/순위/경기/스쿼드/...)가 공유하는 레이아웃.
// 헤더+탭을 여기서 한 번만 렌더링해서, 탭 클릭할 때마다 메뉴 위치가 흔들리던 문제를 근본적으로 해결
export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const info = await getTeamInfo(id)

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-4xl mx-auto pb-16 px-4">
        {info ? (
          <TeamHeader teamId={id} name={info.team.name} country={info.team.country} logo={info.team.logo} />
        ) : (
          <p className="text-floodlight/40 pt-8">팀 정보를 찾을 수 없습니다.</p>
        )}
        <AdSlot label="팀 페이지 배너 광고 (예: 728x90)" className="w-full h-16 mb-6" />
        {children}
      </div>
    </main>
  )
}
