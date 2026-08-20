import type { Metadata } from "next"
import { getTeamInfo, getTeamTransfers } from "@/lib/teamData"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const info = await getTeamInfo(id)
  if (!info) return { title: "이적" }
  return { title: `${info.team.name} 이적`, description: `${info.team.name}의 영입/방출 이적 기록.` }
}

// API의 type 필드를 한국어로 변환 (금액이면 그대로 표시)
function transferTypeLabel(type: string | null): string {
  if (!type || type === "N/A") return "-"
  if (/^loan$/i.test(type)) return "임대"
  if (/^free$/i.test(type)) return "자유 이적"
  return type
}

export default async function TeamTransfersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const info = await getTeamInfo(id)
  if (!info) {
    return <p className="text-floodlight/40 pt-4">팀 정보를 찾을 수 없습니다.</p>
  }

  const entries = await getTeamTransfers(id)

  // 선수별 여러 이적 기록을 개별 행으로 펼치고 최신순 정렬
  const rows = entries
    .flatMap((e) =>
      (e.transfers ?? []).map((t) => ({
        playerName: e.player.name,
        playerId: e.player.id,
        date: t.date,
        type: t.type,
        inTeam: t.teams.in,
        outTeam: t.teams.out,
      }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 40)

  return (
    <>
{rows.length === 0 && <p className="text-floodlight/40 text-sm">이적 기록이 없습니다.</p>}

        <div className="divide-y divide-turf-line/30">
          {rows.map((row, i) => {
            const isIncoming = row.inTeam.id === info.team.id
            return (
              <div key={i} className="flex items-center gap-3 py-3.5 text-sm">
                {/* 원 소속 → 이적 대상 */}
                <div className="flex items-center gap-2 w-56 shrink-0 min-w-0">
                  <img src={row.outTeam.logo} alt="" className="w-5 h-5 shrink-0" />
                  <span className="truncate text-xs text-floodlight/60">{row.outTeam.name}</span>
                  <span className={`shrink-0 ${isIncoming ? "text-green-400" : "text-orange-400"}`}>→</span>
                  <span className="truncate text-xs text-floodlight/60">{row.inTeam.name}</span>
                  <img src={row.inTeam.logo} alt="" className="w-5 h-5 shrink-0" />
                </div>

                <span className="flex-1 truncate font-medium">{row.playerName}</span>

                <span className="text-xs text-floodlight/60 font-data shrink-0 w-20 text-right">
                  {transferTypeLabel(row.type)}
                </span>
                <span className="text-xs text-floodlight/40 font-data shrink-0 w-20 text-right">
                  {new Date(row.date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                </span>
              </div>
            )
          })}
        </div>
    </>
  )
}
