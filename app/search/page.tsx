import Link from "next/link"
import AdSlot from "@/components/AdSlot"
import { MOCK_SEARCH_RESULTS } from "@/lib/mockData"
import Logo from "@/components/Logo"
import PlayerAvatar from "@/components/PlayerAvatar"
import { teamHref } from "@/lib/slug"
import { fetchApiFootball } from "@/lib/apiFootballClient"

type TeamResult = { team: { id: number; name: string; logo: string; country: string } }
type PlayerResult = { player: { id: number; name: string; photo: string; nationality: string } }
type LeagueResult = { league: { id: number; name: string; logo: string; country: string } }

// (2026-09-20) 세 함수 모두 기존엔 fetch를 직접 호출하고 errors 필드를 체크하지
// 않아서, API 레이트리밋 시 "검색 결과 없음"으로 오인될 수 있었다.
// fetchApiFootball()로 통합. 실패는 빈 배열로 처리해 페이지 자체는 안 죽게 한다.
async function searchTeams(q: string): Promise<TeamResult[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_SEARCH_RESULTS.teams
  try {
    const response = await fetchApiFootball(`/teams?search=${encodeURIComponent(q)}`, { revalidate: 3600 })
    return response as TeamResult[]
  } catch (err) {
    console.error("searchTeams 실패:", err instanceof Error ? err.message : err)
    return []
  }
}

async function searchLeagues(q: string): Promise<LeagueResult[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_SEARCH_RESULTS.leagues
  try {
    const response = await fetchApiFootball(`/leagues?search=${encodeURIComponent(q)}`, { revalidate: 3600 })
    return response as LeagueResult[]
  } catch (err) {
    console.error("searchLeagues 실패:", err instanceof Error ? err.message : err)
    return []
  }
}

async function searchPlayers(q: string, season: number): Promise<PlayerResult[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_SEARCH_RESULTS.players
  if (q.length < 4) return []
  try {
    const response = await fetchApiFootball(
      `/players?search=${encodeURIComponent(q)}&season=${season}`,
      { revalidate: 3600 }
    )
    return response as PlayerResult[]
  } catch (err) {
    console.error("searchPlayers 실패:", err instanceof Error ? err.message : err)
    return []
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const q = params.q?.trim() ?? ""

  if (!q) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
        <p className="text-floodlight/50">검색어를 입력해주세요.</p>
      </main>
    )
  }

  const [teams, leagues, players] = await Promise.all([
    searchTeams(q),
    searchLeagues(q),
    searchPlayers(q, new Date().getFullYear()),
  ])

  const totalResults = teams.length + leagues.length + players.length

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
      <div className="max-w-xl mx-auto">
        <p className="text-xs text-floodlight/40 mb-6">
          &apos;{q}&apos; 검색 결과 {totalResults}건
        </p>

        <AdSlot label="검색 결과 배너 광고 (예: 728x90)" className="w-full h-16 mb-6" />

        {leagues.length > 0 && (
          <section className="mb-6">
            <h2 className="font-display uppercase text-sm text-floodlight/60 mb-2">리그</h2>
            <div className="bg-turf/40 border-l-2 border-score-amber">
              {leagues.map((l) => (
                <Link
                  key={l.league.id}
                  href={`/leagues/${l.league.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-turf-line/40 border-b border-turf-line/40 last:border-b-0"
                >
                  <Logo src={l.league.logo} alt="" className="w-6 h-6" />
                  <span className="text-sm">{l.league.name}</span>
                  <span className="text-xs text-floodlight/40 ml-auto">{l.league.country}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {teams.length > 0 && (
          <section className="mb-6">
            <h2 className="font-display uppercase text-sm text-floodlight/60 mb-2">팀</h2>
            <div className="bg-turf/40 border-l-2 border-score-amber">
              {teams.map((t) => (
                <Link
                  key={t.team.id}
                  href={teamHref(t.team.id)} prefetch={false}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-turf-line/40 border-b border-turf-line/40 last:border-b-0"
                >
                  <Logo src={t.team.logo} alt="" className="w-6 h-6" />
                  <span className="text-sm">{t.team.name}</span>
                  <span className="text-xs text-floodlight/40 ml-auto">{t.team.country}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {players.length > 0 && (
          <section className="mb-6">
            <h2 className="font-display uppercase text-sm text-floodlight/60 mb-2">선수</h2>
            <div className="bg-turf/40 border-l-2 border-score-amber">
              {players.map((p) => (
                <Link
                  key={p.player.id}
                  href={`/players/${p.player.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-turf-line/40 border-b border-turf-line/40 last:border-b-0"
                >
                  <PlayerAvatar src={p.player.photo} alt={p.player.name} className="w-8 h-8 rounded-full" />
                  <span className="text-sm">{p.player.name}</span>
                  <span className="text-xs text-floodlight/40 ml-auto">{p.player.nationality}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {totalResults === 0 && (
          <p className="text-floodlight/40 text-sm">검색 결과가 없습니다.</p>
        )}
      </div>
    </main>
  )
}
