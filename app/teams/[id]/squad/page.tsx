import Link from "next/link"
import type { Metadata } from "next"
import TeamHeader from "@/components/TeamHeader"
import PlayerAvatar from "@/components/PlayerAvatar"
import { getTeamInfo, getTeamSquad, getTeamCoach, type SquadPlayer } from "@/lib/teamData"

const POSITION_LABEL: Record<string, string> = {
  Goalkeeper: "골키퍼",
  Defender: "수비수",
  Midfielder: "미드필더",
  Attacker: "공격수",
}
const POSITION_ORDER = ["Goalkeeper", "Defender", "Midfielder", "Attacker"]

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const info = await getTeamInfo(id)
  if (!info) return { title: "스쿼드" }
  return { title: `${info.team.name} 스쿼드`, description: `${info.team.name}의 전체 선수단 명단.` }
}

function SquadRow({ p }: { p: SquadPlayer }) {
  return (
    <Link
      href={`/players/${p.player.id}`}
      className="flex items-center gap-3 py-2.5 border-b border-turf-line/30 last:border-b-0 hover:bg-turf-line/20 transition-colors"
    >
      <PlayerAvatar
        src={p.player.photo}
        alt={p.player.name}
        className="w-9 h-9 rounded-full object-cover bg-turf-line text-xs shrink-0"
      />
      <span className="font-data text-xs text-floodlight/40 w-6 text-center shrink-0">
        {p.player.number ?? "-"}
      </span>
      <span className="flex-1 text-sm truncate">{p.player.name}</span>
      <span className="text-xs text-floodlight/40 shrink-0">{p.player.age}세</span>
    </Link>
  )
}

export default async function TeamSquadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const info = await getTeamInfo(id)
  if (!info) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
        <p className="text-floodlight/40">팀 정보를 찾을 수 없습니다.</p>
      </main>
    )
  }

  const [squad, coach] = await Promise.all([getTeamSquad(id), getTeamCoach(id, info.team.id)])

  const groups = new Map<string, SquadPlayer[]>()
  for (const p of squad) {
    if (!groups.has(p.position)) groups.set(p.position, [])
    groups.get(p.position)!.push(p)
  }

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-3xl mx-auto pb-16 px-4">
        <TeamHeader teamId={id} name={info.team.name} country={info.team.country} logo={info.team.logo} active="squad" />

        {coach && (
          <div className="mb-6">
            <p className="text-sm font-medium text-floodlight/70 mb-2">감독</p>
            <div className="flex items-center gap-3 py-2.5">
              <PlayerAvatar
                src={coach.photo}
                alt={coach.name}
                className="w-9 h-9 rounded-full object-cover bg-turf-line text-xs shrink-0"
              />
              <span className="flex-1 text-sm">{coach.name}</span>
              <span className="text-xs text-floodlight/40">{coach.nationality}</span>
            </div>
          </div>
        )}

        {squad.length === 0 && <p className="text-floodlight/40 text-sm">스쿼드 정보가 없습니다.</p>}

        {POSITION_ORDER.filter((pos) => groups.has(pos)).map((pos) => (
          <div key={pos} className="mb-6">
            <p className="text-sm font-medium text-floodlight/70 mb-1">{POSITION_LABEL[pos] ?? pos}</p>
            {groups.get(pos)!.map((p) => (
              <SquadRow key={p.player.id} p={p} />
            ))}
          </div>
        ))}
      </div>
    </main>
  )
}
