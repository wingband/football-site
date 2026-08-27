export const dynamic = 'force-dynamic'

import type { Metadata } from "next"
import Link from "next/link"
import { matchHref } from "@/lib/slug"
import { getSeasonYear } from "@/lib/season"
import FollowButton from "@/components/FollowButton"
import AdSlot from "@/components/AdSlot"
import PlayerAvatar from "@/components/PlayerAvatar"
import Logo from "@/components/Logo"
import {
  getPlayerDataWithFallback,
  getPlayerTransfers,
  getPlayerCareer,
  getPlayerRecentMatches,
  getTrophies,
  getSidelined,
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
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ season?: string }>
}) {
  const { id } = await params
  const sp = await searchParams

  const defaultSeason = getSeasonYear("England")
  const season = sp.season ? parseInt(sp.season) : defaultSeason

  const data = await getPlayerDataWithFallback(id, season)

  if (!data) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
        <p className="text-floodlight/40">선수 정보를 찾을 수 없습니다.</p>
      </main>
    )
  }

  const { player } = data

  // 클럽 스탯 우선: 국가대표/친선경기/아시안게임 등 모두 제외하고 클럽 리그만
  const NATIONAL_KEYWORDS = ["World Cup", "AFC", "Asian", "Olympic", "Friendlies", "Qualification", "Nations"]
  const clubStats = data.statistics.filter(
    (s) => !NATIONAL_KEYWORDS.some((kw) => s.league.name.includes(kw))
  )
  const stat = (clubStats.length > 0 ? clubStats : data.statistics).sort(
    (a, b) => (b.games.appearences ?? 0) - (a.games.appearences ?? 0)
  )[0]

  const [transfers, career, recentMatches, trophies, sidelined] = await Promise.all([
    getPlayerTransfers(id),
    getPlayerCareer(id, season),
    stat ? getPlayerRecentMatches(id, stat.team.id, season, 8) : Promise.resolve([]),
    getTrophies(id),
    getSidelined(id),
  ])

  // 현재 팀으로의 이적만 배너 표시
  const currentTeamName = stat?.team?.name ?? ""
  const latestTransfer = [...transfers]
    .flatMap((t) => t.transfers.map((tr) => ({ ...tr, update: t.update })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .find(
      (tr) =>
        tr.teams.in?.name &&
        currentTeamName &&
        tr.teams.in.name.toLowerCase().replace(/\s/g, "") ===
          currentTeamName.toLowerCase().replace(/\s/g, "")
    ) ?? null

  const nationalCareer = career.filter((c) => c.teamName === player.nationality)
  const clubCareer = career.filter((c) => c.teamName !== player.nationality)
  const winnerTrophies = trophies.filter((t) => t.place.toLowerCase().includes("winner"))

  const ageText = player.birth?.date
    ? `${player.age}세 (${new Date(player.birth.date).toLocaleDateString("ko-KR")})`
    : `${player.age}세`

  // 시즌 선택 드롭다운용 (최근 5시즌)
  const availableSeasons = Array.from({ length: 5 }, (_, i) => defaultSeason - i)

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-3xl mx-auto pb-16 px-4">

        {/* ── 헤더: 사진 + 이름 + 현재 소속팀 ── */}
        <div className="flex items-start justify-between gap-3 pt-8 pb-6 border-b border-turf-line/40">
          <div className="flex items-start gap-4 min-w-0">
            <PlayerAvatar
              src={player.photo}
              alt={player.name}
              className="w-20 h-20 rounded-full object-cover bg-turf-line text-xl shrink-0"
            />
            <div className="min-w-0">
              <h1 className="font-display uppercase text-2xl truncate">{player.name}</h1>
              {/* 국적 */}
              <p className="text-sm text-floodlight/50 mt-0.5">{player.nationality}</p>
              {/* 현재 소속팀 — 눈에 띄게 */}
              {stat && (
                <Link
                  href={`/teams/${stat.team.id}`}
                  className="flex items-center gap-2 mt-2 w-fit bg-turf-line/30 hover:bg-turf-line/50 px-3 py-1.5 rounded-full transition-colors"
                >
                  <Logo src={stat.team.logo} alt="" className="w-5 h-5" />
                  <span className="text-sm font-semibold text-score-amber">{stat.team.name}</span>
                  <span className="text-xs text-floodlight/40">{stat.league.name}</span>
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <FollowButton />
            {/* 이 선수를 선수1로 넣고 비교 페이지로 — 상대는 거기서 검색해서 고름 */}
            <Link
              href={`/compare?player1=${id}`}
              className="whitespace-nowrap text-xs px-3 py-1.5 border border-score-amber/60 bg-score-amber/10 text-score-amber hover:bg-score-amber/20 rounded-full transition-colors"
            >
              이 선수와 비교하기
            </Link>
          </div>
        </div>

        <AdSlot label="선수 페이지 배너 광고 (예: 728x90)" className="w-full h-16 my-4" />

        {/* 최신 이적 배너 */}
        {latestTransfer && (
          <div className="flex items-center gap-2 text-xs text-floodlight/50 py-3 border-b border-turf-line/30">
            <Logo src={latestTransfer.teams.out.logo} alt="" className="w-4 h-4" />
            <span>{latestTransfer.teams.out.name}에서 이적</span>
            {latestTransfer.type && <span className="text-score-amber">({latestTransfer.type})</span>}
            <span className="ml-auto">
              {new Date(latestTransfer.date).toLocaleDateString("ko-KR")}
            </span>
          </div>
        )}

        {/* ── 기본 정보 ── */}
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

        {/* ── 시즌 성적 요약 + 시즌 선택 ── */}
        {stat && (
          <div className="py-6 border-b border-turf-line/30">
            {/* 헤더: 리그명 + 시즌 선택 */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold">{stat.league.name}</p>
                <p className="text-xs text-floodlight/40">{season}/{season + 1} 시즌</p>
              </div>
              <div className="flex gap-1">
                {availableSeasons.map((s) => (
                  <Link
                    key={s}
                    href={`/players/${id}?season=${s}`}
                    className={`text-[10px] px-2 py-1 rounded font-data transition-colors ${
                      s === season
                        ? "bg-score-amber text-pitch-night font-bold"
                        : "bg-turf-line/30 text-floodlight/50 hover:bg-turf-line/60"
                    }`}
                  >
                    {s}/{String(s + 1).slice(2)}
                  </Link>
                ))}
              </div>
            </div>

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

        {/* ── 시즌 상세 통계 ── */}
        {stat && (
          <div className="py-6 border-b border-turf-line/30">
            <p className="text-sm font-medium mb-4">
              시즌 상세 통계
              <span className="text-xs text-floodlight/40 ml-2">{stat.league.name} {season}/{season + 1}</span>
            </p>
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

        {/* ── 최근 경기 ── */}
        {recentMatches.length > 0 && (
          <div className="py-6 border-b border-turf-line/30">
            <p className="text-sm font-medium mb-3">최근 경기</p>
            <div className="divide-y divide-turf-line/20">
              {recentMatches.map((m) => (
                <Link
                  key={m.fixture.id}
                  href={matchHref(m)}
                  className="flex items-center gap-3 py-2.5 hover:bg-turf-line/20 transition-colors -mx-1 px-1"
                >
                  <span className="text-[11px] text-floodlight/40 w-14 shrink-0">
                    {new Date(m.fixture.date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                  </span>
                  <Logo src={m.teams.home.logo} alt="" className="w-4 h-4 shrink-0" />
                  <span className="text-xs flex-1 truncate">
                    {m.teams.home.name} {m.goals.home}-{m.goals.away} {m.teams.away.name}
                  </span>
                  <Logo src={m.teams.away.logo} alt="" className="w-4 h-4 shrink-0" />
                  <span className="text-[11px] text-floodlight/40 w-8 text-right shrink-0">
                    {m.stat.games.minutes ?? "-"}&apos;
                  </span>
                  {(m.stat.goals.total ?? 0) > 0 && <span className="shrink-0 text-xs">⚽{m.stat.goals.total}</span>}
                  {(m.stat.goals.assists ?? 0) > 0 && <span className="shrink-0 text-xs">🅰️{m.stat.goals.assists}</span>}
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

        {/* ── 경력 ── */}
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
                      <Logo src={c.teamLogo} alt="" className="w-6 h-6 shrink-0" />
                      <span className="text-sm flex-1 truncate">{c.teamName}</span>
                      {/* 시즌 범위 */}
                      <span className="text-xs text-floodlight/40 font-data shrink-0 w-20 text-right">
                        {Math.min(...c.seasons)}/{String(Math.max(...c.seasons) + 1).slice(2)}
                      </span>
                      {/* 경기 + 골 — 같은 줄, 고정폭 */}
                      <span className="text-xs text-floodlight/30 font-data shrink-0 w-24 text-right">
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
                      <Logo src={c.teamLogo} alt="" className="w-6 h-6 shrink-0" />
                      <span className="text-sm flex-1 truncate">{c.teamName}</span>
                      <span className="text-xs text-floodlight/30 font-data shrink-0 w-24 text-right">
                        {c.apps}경기 {c.goals}골
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 트로피 ── */}
        {winnerTrophies.length > 0 && (
          <div className="py-6 border-b border-turf-line/30">
            <p className="text-sm font-medium mb-3">트로피</p>
            <div className="space-y-2">
              {winnerTrophies.slice(0, 8).map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-score-amber">🏆</span>
                  <span className="flex-1 text-floodlight/90">{t.league} ({t.country})</span>
                  <span className="text-xs text-floodlight/40 font-data shrink-0">{t.season}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 부상 이력 ── */}
        {sidelined.length > 0 && (
          <div className="py-6 border-b border-turf-line/30">
            <p className="text-sm font-medium mb-3">⚕️ 부상 이력</p>
            <div className="space-y-2">
              {sidelined.slice(0, 8).map((s, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="text-red-400 shrink-0">●</span>
                  <span className="flex-1 text-floodlight/80">{s.type}</span>
                  <span className="text-floodlight/40 font-data shrink-0">
                    {s.start ? new Date(s.start).toLocaleDateString("ko-KR", { year: "numeric", month: "short" }) : "–"}
                    {s.end ? ` ~ ${new Date(s.end).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}` : " ~ 진행중"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 소개 ── */}
        {stat && (
          <div className="py-6">
            <p className="text-sm font-medium mb-3">소개</p>
            <p className="text-sm text-floodlight/60 leading-relaxed">
              {player.name}은(는) {player.nationality} 국적의 {player.age}세 선수로, 현재 {stat.team.name} 소속 {POSITION_KR[stat.games.position] ?? stat.games.position}입니다.{" "}
              {stat.league.name} {season}/{season + 1} 시즌 {stat.games.appearences ?? 0}경기에 출전해 {stat.goals.total ?? 0}골 {stat.goals.assists ?? 0}도움을 기록했고, 평균 평점은 {stat.games.rating ?? "-"}입니다.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
