import Link from "next/link"
import { MOCK_SEARCH_RESULTS } from "@/lib/mockData"
import Logo from "@/components/Logo"
import PlayerAvatar from "@/components/PlayerAvatar"
import { teamHref } from "@/lib/slug"
import { fetchApiFootball } from "@/lib/apiFootballClient"
import { TEAM_NAME_KO, LEAGUE_NAME_KO, teamKo, leagueKo } from "@/lib/koreanNames"
import { KOREAN_PLAYERS_ABROAD } from "@/lib/koreanPlayersAbroad"

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

// 제공처(API-Football) 검색은 영어만 알아듣는다 — "손흥민"을 치면 0건이 나오던 이유.
// 한글로 검색하면: 해외파 선수는 우리 목록에서 바로 찾고, 팀·리그는 한글 이름표에서 영어 이름을 찾아 그걸로 조회한다.
const HANGUL = /[가-힣]/
const squash = (v: string) => v.replace(/\s+/g, "").toLowerCase()

function koreanPlayers(q: string): PlayerResult[] {
  const nq = squash(q)
  return KOREAN_PLAYERS_ABROAD.filter((p) => squash(p.name).includes(nq)).map((p) => ({
    player: { id: p.id, name: p.name, photo: `https://media.api-sports.io/football/players/${p.id}.png`, nationality: "대한민국" },
  }))
}

async function searchTeamsKo(q: string): Promise<TeamResult[]> {
  const nq = squash(q)
  const names = Object.entries(TEAM_NAME_KO)
    .filter(([, ko]) => squash(ko).includes(nq))
    .map(([en]) => en)
    .slice(0, 4)
  const found = await Promise.all(
    names.map(async (en) => {
      try {
        const r = (await fetchApiFootball(`/teams?search=${encodeURIComponent(en)}`, { revalidate: 86400 })) as TeamResult[]
        return r.find((x) => x.team.name === en) ?? r[0] ?? null
      } catch {
        return null
      }
    })
  )
  const seen = new Set<number>()
  return found.filter((x): x is TeamResult => !!x && !seen.has(x.team.id) && !!seen.add(x.team.id))
}

async function searchLeaguesKo(q: string): Promise<LeagueResult[]> {
  const nq = squash(q)
  const names = Object.entries(LEAGUE_NAME_KO)
    .filter(([, ko]) => squash(ko).includes(nq))
    .map(([en]) => en)
    .slice(0, 3)
  const found = await Promise.all(
    names.map(async (en) => {
      try {
        const r = (await fetchApiFootball(`/leagues?search=${encodeURIComponent(en)}`, { revalidate: 86400 })) as LeagueResult[]
        return r.find((x) => x.league.name === en) ?? r[0] ?? null
      } catch {
        return null
      }
    })
  )
  const seen = new Set<number>()
  return found.filter((x): x is LeagueResult => !!x && !seen.has(x.league.id) && !!seen.add(x.league.id))
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
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 text-floodlight">
        <p className="text-sm text-floodlight/75">검색어를 입력해주세요.</p>
      </main>
    )
  }

  const korean = HANGUL.test(q)
  const [teams, leagues, players] = korean
    ? await Promise.all([searchTeamsKo(q), searchLeaguesKo(q), Promise.resolve(koreanPlayers(q))])
    : await Promise.all([searchTeams(q), searchLeagues(q), searchPlayers(q, new Date().getFullYear())])

  const totalResults = teams.length + leagues.length + players.length

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-floodlight">
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-floodlight">
          &apos;{q}&apos; 검색 결과 <span className="text-score-amber font-data">{totalResults}</span>건
        </h1>


        {leagues.length > 0 && (
          <section className="bg-turf/40 border border-turf-line/60 p-4 sm:p-5">
            <h2 className="text-base font-semibold text-floodlight mb-2">리그 <span className="text-sm font-normal text-floodlight/65 font-data">{leagues.length}</span></h2>
            <div className="divide-y divide-turf-line/40">
              {leagues.map((l) => (
                <Link
                  key={l.league.id}
                  href={`/leagues/${l.league.id}`}
                  className="flex items-center gap-3 px-1 py-3 hover:bg-turf-line/20"
                >
                  <Logo src={l.league.logo} alt="" className="w-6 h-6" />
                  <span className="text-sm">{leagueKo(l.league.name)}</span>
                  <span className="text-xs text-floodlight/65 ml-auto">{l.league.country}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {teams.length > 0 && (
          <section className="bg-turf/40 border border-turf-line/60 p-4 sm:p-5">
            <h2 className="text-base font-semibold text-floodlight mb-2">팀 <span className="text-sm font-normal text-floodlight/65 font-data">{teams.length}</span></h2>
            <div className="divide-y divide-turf-line/40">
              {teams.map((t) => (
                <Link
                  key={t.team.id}
                  href={teamHref(t.team.id)} prefetch={false}
                  className="flex items-center gap-3 px-1 py-3 hover:bg-turf-line/20"
                >
                  <Logo src={t.team.logo} alt="" className="w-6 h-6" />
                  <span className="text-sm">{teamKo(t.team.name)}</span>
                  <span className="text-xs text-floodlight/65 ml-auto">{t.team.country}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {players.length > 0 && (
          <section className="bg-turf/40 border border-turf-line/60 p-4 sm:p-5">
            <h2 className="text-base font-semibold text-floodlight mb-2">선수 <span className="text-sm font-normal text-floodlight/65 font-data">{players.length}</span></h2>
            <div className="divide-y divide-turf-line/40">
              {players.map((p) => (
                <Link
                  key={p.player.id}
                  href={`/players/${p.player.id}`}
                  className="flex items-center gap-3 px-1 py-3 hover:bg-turf-line/20"
                >
                  <PlayerAvatar src={p.player.photo} alt={p.player.name} className="w-10 h-10 rounded-full ring-2 ring-score-amber/60" />
                  <span className="text-sm">{p.player.name}</span>
                  <span className="text-xs text-floodlight/65 ml-auto">{p.player.nationality}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {totalResults === 0 && (
          <div className="bg-turf/40 border border-turf-line/60 p-4 sm:p-5 text-sm text-floodlight/80 leading-relaxed">
            <p className="font-semibold text-floodlight">검색 결과가 없어요</p>
            <p className="mt-1">한글로는 해외파 선수, 주요 팀, 리그 이름을 찾을 수 있어요. 그 밖의 선수는 영어 이름(예: Haaland)으로 검색해 주세요.</p>
          </div>
        )}
      </div>
    </main>
  )
}
