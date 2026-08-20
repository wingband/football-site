import type { Metadata } from "next"
import Link from "next/link"
import { getSeasonYear } from "@/lib/season"
import FollowButton from "@/components/FollowButton"
import AdSlot from "@/components/AdSlot"
import PlayerAvatar from "@/components/PlayerAvatar"
import {
  getPlayerDataWithFallback,
  getPlayerTransfers,
  getPlayerCareer,
  getPlayerRecentMatches,
  getTrophies,
} from "@/lib/playerData"

const POSITION_KR: Record<string, string> = {
  Goalkeeper: "골키퍼",
  Defender: "수비수",
  Midfielder: "미드필더",
  Attacker: "공격수",
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const data = await getPlayerDataWithFallback(id, getSeasonYear("England"))

  if (!data) return { title: "선수 정보를 찾을 수 없습니다" }

  return {
    title: `${data.player.name} 선수 정보 및 통계`,
    description: `${data.player.name}(${data.player.nationality})의 출전 기록, 골, 도움, 평점 등 시즌 통계를 확인하세요.`,
  }
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-turf-line/20 last:border-b-0 text-sm">
      <span className="text-floodlight/50">{label}</span>
      <span className="font-data font-medium">{value}</span>
    </div>
  )
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const season = getSeasonYear("England")
  const data = await getPlayerDataWithFallback(id, season)

  if (!data) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
        <p className="text-floodlight/40">선수 정보를 찾을 수 없습니다.</p>
      </main>
    )
  }

  const { player } = data
  const stat = data.statistics.sort(
    (a, b) => (b.games.appearences ?? 0) - (a.games.appearences ?? 0)
  )[0]

  const [transfers, career, recentMatches, trophies] = await Promise.all([
    getPlayerTransfers(id),
    stat ? getPlayerCareer(id, season) : Promise.resolve([]),
    stat ? getPlayerRecentMatches(id, stat.team.id, season, 8) : Promise.resolve([]),
    getTrophies(id),
  ])

  const latestTransfer = [...transfers]
    .flatMap((t) => t.transfers.map((tr) => ({ ...tr, update: t.update })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

  // 국가대표 이력(팀명이 국적과 같은 항목)과 클럽 경력을 분리
  const nationalCareer = career.filter((c) => c.teamName === player.nationality)
  const clubCareer = career.filter((c) => c.teamName !== player.nationality)

  const winnerTrophies = trophies.filter((t) => t.place.toLowerCase().includes("winner"))

  const ageText = player.birth?.date
    ? `${player.age}세 (${new Date(player.birth.date).toLocaleDateString("ko-KR")})`
    : `${player.age}세`

  const aboutText = stat
    ? `${player.name}은(는) ${player.nationality} 국적의 ${player.age}세 선수로, 현재 ${stat.team.name} 소속 ${POSITION_KR[stat.games.position] ?? stat.games.position}입니다. ${stat.league.name} ${season} 시즌 ${stat.games.appearences ?? 0}경기에 출전해 ${stat.goals.total ?? 0}골 ${stat.goals.assists ?? 0}도움을 기록했고, 평균 평점은 ${stat.games.rating ?? "-"}입니다.`
    : `${player.name}은(는) ${player.nationality} 국적의 ${player.age}세 선수입니다.`

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-3xl mx-auto pb-16 px-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between gap-3 pt-8 pb-6 border-b border-turf-line/40">
          <div className="flex items-center gap-4 min-w-0">
            <PlayerAvatar
              src={player.photo}
              alt={player.name}
              className="w-16 h-16 rounded-full object-cover bg-turf-line text-lg shrink-0"
            />
            <div className="min-w-0">
              <h1 className="font-display uppercase text-xl truncate">{player.name}</h1>
              {stat && (
                <Link
                  href={`/teams/${stat.team.id}`}
                  className="flex items-center gap-2 mt-1 hover:text-score-amber"
                >
                  <img src={stat.team.logo} alt="" className="w-4 h-4" />
                  <span className="text-sm text-floodlight/70">{stat.team.name}</span>
                </Link>
              )}
            </div>
          </div>
          <FollowButton />
        </div>

        <AdSlot label="선수 페이지 배너 광고 (예: 728x90)" className="w-full h-16 my-4" />

        {/* 최신 이적 배너 */}
        {latestTransfer && (
          <div className="flex items-center gap-2 text-xs text-floodlight/50 py-3 border-b border-turf-line/30">
            <img src={latestTransfer.teams.out.logo} alt="" className="w-4 h-4" />
            <span>{latestTransfer.teams.out.name}에서 이적</span>
            {latestTransfer.type && <span className="text-score-amber">({latestTransfer.type})</span>}
            <span className="ml-auto">
              {new Date(latestTransfer.date).toLocaleDateString("ko-KR")}
            </span>
          </div>
        )}

        {/* 기본 정보 */}
        <div className="grid sm:grid-cols-2 gap-4 py-6 border-b border-turf-line/30">
          <div className="space-y-2 text-sm">
            {player.height && (
              <div className="flex justify-between">
                <span className="text-floodlight/40">키</span>
                <span className="font-data">{player.height}</span>
              </div>
            )}
            {player.weight && (
              <div className="flex justify-between">
                <span className="text-floodlight/40">몸무게</span>
                <span className="font-data">{player.weight}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-floodlight/40">나이</span>
              <span className="font-data">{ageText}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-floodlight/40">국적</span>
              <span>{player.nationality}</span>
            </div>
          </div>
          {stat && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-floodlight/40">포지션</span>
                <span>{POSITION_KR[stat.games.position] ?? stat.games.position}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-floodlight/40">등번호</span>
                <span className="font-data">{stat.games.number ?? "-"}</span>
              </div>
            </div>
          )}
        </div>

        {/* 시즌 성적 요약 */}
        {stat && (
          <div className="py-6 border-b border-turf-line/30">
            <p className="text-sm font-medium mb-4">
              {stat.league.name} {season}/{season + 1} 시즌
            </p>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="font-display text-xl text-score-amber">{stat.goals.total ?? 0}</p>
                <p className="text-[11px] text-floodlight/40 mt-1">득점</p>
              </div>
              <div>
                <p className="font-display text-xl text-score-amber">{stat.goals.assists ?? 0}</p>
                <p className="text-[11px] text-floodlight/40 mt-1">어시스트</p>
              </div>
              <div>
                <p className="font-display text-xl">{stat.games.lineups ?? "-"}</p>
                <p className="text-[11px] text-floodlight/40 mt-1">선발</p>
              </div>
              <div>
                <p className="font-display text-xl">{stat.games.appearences ?? "-"}</p>
                <p className="text-[11px] text-floodlight/40 mt-1">경기</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center mt-4">
              <div>
                <p className="font-display text-xl">{stat.games.minutes ?? "-"}</p>
                <p className="text-[11px] text-floodlight/40 mt-1">출전 시간</p>
              </div>
              <div>
                <p className="font-display text-xl bg-green-600/20 text-green-400 rounded inline-block px-2">
                  {stat.games.rating ?? "-"}
                </p>
                <p className="text-[11px] text-floodlight/40 mt-1">평점</p>
              </div>
              <div>
                <p className="font-display text-xl">🟨 {stat.cards.yellow ?? 0}</p>
                <p className="text-[11px] text-floodlight/40 mt-1">경고</p>
              </div>
              <div>
                <p className="font-display text-xl">🟥 {stat.cards.red ?? 0}</p>
                <p className="text-[11px] text-floodlight/40 mt-1">퇴장</p>
              </div>
            </div>
          </div>
        )}

        {/* 최근 경기 */}
        {recentMatches.length > 0 && (
          <div className="py-6 border-b border-turf-line/30">
            <p className="text-sm font-medium mb-3">최근 경기</p>
            <div className="divide-y divide-turf-line/20">
              {recentMatches.map((m) => (
                <Link
                  key={m.fixture.id}
                  href={`/matches/${m.fixture.id}`}
                  className="flex items-center gap-3 py-2.5 hover:bg-turf-line/20 transition-colors -mx-1 px-1"
                >
                  <span className="text-[11px] text-floodlight/40 w-16 shrink-0">
                    {new Date(m.fixture.date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                  </span>
                  <img src={m.teams.home.logo} alt="" className="w-4 h-4 shrink-0" />
                  <span className="text-xs flex-1 truncate">
                    {m.teams.home.name} {m.goals.home}-{m.goals.away} {m.teams.away.name}
                  </span>
                  <img src={m.teams.away.logo} alt="" className="w-4 h-4 shrink-0" />
                  <span className="text-[11px] text-floodlight/40 w-10 text-right shrink-0">
                    {m.stat.games.minutes ?? "-"}&apos;
                  </span>
                  {(m.stat.goals.total ?? 0) > 0 && <span className="shrink-0">⚽{m.stat.goals.total}</span>}
                  {(m.stat.goals.assists ?? 0) > 0 && <span className="shrink-0">🅰️{m.stat.goals.assists}</span>}
                  {m.stat.games.rating && (
                    <span className="text-xs font-data font-bold bg-green-600/20 text-green-400 px-1.5 py-0.5 rounded shrink-0">
                      {m.stat.games.rating}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 경력 */}
        {(clubCareer.length > 0 || nationalCareer.length > 0) && (
          <div className="py-6 border-b border-turf-line/30">
            <p className="text-sm font-medium mb-3">경력</p>
            {clubCareer.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-floodlight/40 mb-2">클럽</p>
                <div className="divide-y divide-turf-line/20">
                  {clubCareer.map((c) => (
                    <Link
                      key={c.teamId}
                      href={`/teams/${c.teamId}`}
                      className="flex items-center gap-3 py-2 hover:bg-turf-line/20 transition-colors -mx-1 px-1"
                    >
                      <img src={c.teamLogo} alt="" className="w-6 h-6 shrink-0" />
                      <span className="text-sm flex-1 truncate">{c.teamName}</span>
                      <span className="text-xs text-floodlight/40 font-data shrink-0">
                        {Math.min(...c.seasons)}-{Math.max(...c.seasons) + 1}
                      </span>
                      <span className="text-xs text-floodlight/30 font-data w-16 text-right shrink-0">
                        {c.apps}경기 {c.goals}골
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {nationalCareer.length > 0 && (
              <div>
                <p className="text-xs text-floodlight/40 mb-2">국가대표</p>
                <div className="divide-y divide-turf-line/20">
                  {nationalCareer.map((c) => (
                    <div key={c.teamId} className="flex items-center gap-3 py-2">
                      <img src={c.teamLogo} alt="" className="w-6 h-6 shrink-0" />
                      <span className="text-sm flex-1 truncate">{c.teamName}</span>
                      <span className="text-xs text-floodlight/30 font-data w-16 text-right shrink-0">
                        {c.apps}경기 {c.goals}골
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 상세 시즌 통계 */}
        {stat && (
          <div className="py-6 border-b border-turf-line/30">
            <p className="text-sm font-medium mb-4">시즌 상세 통계</p>
            <div className="grid sm:grid-cols-2 gap-x-8">
              <div>
                <p className="text-xs text-floodlight/40 mb-1">슈팅</p>
                <StatRow label="슈팅" value={stat.shots.total ?? "-"} />
                <StatRow label="유효 슈팅" value={stat.shots.on ?? "-"} />
              </div>
              <div>
                <p className="text-xs text-floodlight/40 mb-1 mt-4 sm:mt-0">패스</p>
                <StatRow label="패스" value={stat.passes.total ?? "-"} />
                <StatRow label="키패스" value={stat.passes.key ?? "-"} />
                <StatRow label="패스 성공률" value={stat.passes.accuracy ? `${stat.passes.accuracy}%` : "-"} />
              </div>
              <div>
                <p className="text-xs text-floodlight/40 mb-1 mt-4">점유</p>
                <StatRow label="듀얼 시도" value={stat.duels.total ?? "-"} />
                <StatRow label="듀얼 승리" value={stat.duels.won ?? "-"} />
                <StatRow label="드리블 시도" value={stat.dribbles.attempts ?? "-"} />
                <StatRow label="드리블 성공" value={stat.dribbles.success ?? "-"} />
              </div>
              <div>
                <p className="text-xs text-floodlight/40 mb-1 mt-4">수비/반칙</p>
                <StatRow label="태클" value={stat.tackles.total ?? "-"} />
                <StatRow label="인터셉트" value={stat.tackles.interceptions ?? "-"} />
                <StatRow label="파울 유도" value={stat.fouls.drawn ?? "-"} />
                <StatRow label="파울" value={stat.fouls.committed ?? "-"} />
              </div>
            </div>
          </div>
        )}

        {/* 트로피 */}
        {winnerTrophies.length > 0 && (
          <div className="py-6 border-b border-turf-line/30">
            <p className="text-sm font-medium mb-3">트로피</p>
            <div className="space-y-2">
              {winnerTrophies.slice(0, 8).map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-score-amber">🏆</span>
                  <span className="flex-1 text-floodlight/90">
                    {t.league} ({t.country})
                  </span>
                  <span className="text-xs text-floodlight/40 font-data">{t.season}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* About */}
        <div className="py-6">
          <p className="text-sm font-medium mb-3">소개</p>
          <p className="text-sm text-floodlight/60 leading-relaxed">{aboutText}</p>
        </div>
      </div>
    </main>
  )
}
