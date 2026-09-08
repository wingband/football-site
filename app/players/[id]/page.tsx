import type { Metadata } from "next"
import Link from "next/link"
import { getSeasonYear } from "@/lib/season"
import FollowButton from "@/components/FollowButton"
import AdSlot from "@/components/AdSlot"
import PlayerAvatar from "@/components/PlayerAvatar"
import Logo from "@/components/Logo"
import PlayerCareerRecent from "@/components/PlayerCareerRecent"
import { KOREAN_PLAYERS_ABROAD } from "@/lib/koreanPlayersAbroad"
import { TEAM_NAME_KO } from "@/lib/koreanNames"
import {
  getPlayerDataWithFallback,
  getPlayerTransfers,
  getTrophies,
  getSidelined,
} from "@/lib/playerData"

const NATIONAL_KEYWORDS_META = ["World Cup", "AFC", "Asian", "Olympic", "Friendlies", "Qualification", "Nations"]

const POSITION_KR: Record<string, string> = {
  Goalkeeper: "골키퍼",
  Defender: "수비수",
  Midfielder: "미드필더",
  Attacker: "공격수",
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ season?: string }>
}): Promise<Metadata> {
  const { id } = await params
  const sp = await searchParams
  const season = sp.season ? parseInt(sp.season) : getSeasonYear("England")
  const data = await getPlayerDataWithFallback(id, season)
  if (!data) return { title: "선수 정보를 찾을 수 없습니다" }

  // 한국인 해외파 트래커에 등록된 선수면 한국어 이름 사용 (API는 로마자 표기만 줌)
  // "손흥민 다음경기", "이강인 오늘 경기" 같은 검색어를 겨냥한 타이틀/설명 구성
  const koreanEntry = KOREAN_PLAYERS_ABROAD.find((p) => p.id === Number(id))
  const displayName = koreanEntry?.name ?? data.player.name

  const clubStats = data.statistics.filter(
    (s) => !NATIONAL_KEYWORDS_META.some((kw) => s.league.name.includes(kw))
  )
  // 국가대표 스탯으로는 폴백하지 않는다 — 이적 직후라 클럽 스탯이 아직 없으면
  // 그냥 팀명 없이 제목을 구성한다 (국가대표팀을 소속팀처럼 잘못 보여주는 것 방지)
  const primaryStat = clubStats[0]
  const teamNameRaw = primaryStat?.team?.name ?? ""
  const teamNameKo = TEAM_NAME_KO[teamNameRaw] ?? teamNameRaw

  return {
    title: teamNameKo
      ? `${displayName} 다음경기 일정 · 최근 스탯 - ${teamNameKo}`
      : `${displayName} 다음경기 일정 및 최근 스탯`,
    description: `${displayName}의 다음 경기 일정, 최근 출전 기록, 골, 도움, 평점 등 시즌 스탯을 확인하세요.${
      teamNameKo ? ` 현재 소속팀: ${teamNameKo}.` : ""
    }`,
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
  let stat = clubStats.sort(
    (a, b) => (b.games.appearences ?? 0) - (a.games.appearences ?? 0)
  )[0]

  // 막 이적/임대 복귀한 직후라 이번 시즌 클럽 스탯이 아직 API에 없는 경우를 위한 대비.
  // 예전엔 이럴 때 국가대표 스탯(월드컵 예선 등)을 "현재 소속팀"인 것처럼 잘못 보여줬다
  // (2026-09-08, 김지수·황희찬 페이지에서 국가대표팀이 소속팀으로 잘못 뜨던 것 확인).
  // 국가대표 스탯으로는 절대 폴백하지 않고, 지난 시즌 클럽 스탯을 대신 찾아본다
  if (!stat) {
    const prevData = await getPlayerDataWithFallback(id, season - 1)
    const prevClubStats = prevData?.statistics.filter(
      (s) => !NATIONAL_KEYWORDS.some((kw) => s.league.name.includes(kw))
    ) ?? []
    stat = prevClubStats.sort(
      (a, b) => (b.games.appearences ?? 0) - (a.games.appearences ?? 0)
    )[0]
  }

  const [transfers, trophies, sidelined] = await Promise.all([
    getPlayerTransfers(id),
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

        {/* ── 최근 경기 + 경력 (마운트 후 지연 로딩) ── */}
        <PlayerCareerRecent
          playerId={id}
          season={season}
          teamId={stat?.team.id ?? null}
          nationality={player.nationality}
        />

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
