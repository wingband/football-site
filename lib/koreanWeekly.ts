import { cache } from "react"
import { apiFetch } from "@/lib/matchApi"
import { KOREAN_PLAYERS_ABROAD, type KoreanPlayer } from "@/lib/koreanPlayersAbroad"
import { TEAM_NAME_KO, LEAGUE_NAME_KO } from "@/lib/koreanNames"
import { getMatchPhase } from "@/lib/matchStatus"

// 해외파 허브(/korean-players)와 주간 해외파 칼럼 초안이 함께 쓰는 데이터.
// (2026-10-10 신설)
//
// API 사용량: 선수 13명이지만 소속팀 기준으로 묶어서 팀당 2콜(최근/다음 경기) +
// 최근 7일 내 종료 경기당 1콜(선수 개인 기록). 전부 DB 캐시(apiFetch → getCachedOrFetch)를
// 거치므로 방문자 수와 무관하게 TTL 동안은 추가 호출이 없다.
const TEAM_FIXTURES_TTL = 10800 // 3시간
const FIXTURE_PLAYERS_TTL = 86400 // 종료 경기의 개인 기록은 바뀌지 않으니 하루

type RawFixture = {
  fixture: { id: number; date: string; status: { short: string } }
  league: { id: number; name: string; logo?: string }
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null }
    away: { id: number; name: string; logo: string; winner: boolean | null }
  }
  goals: { home: number | null; away: number | null }
}

type RawFixturePlayers = {
  team: { id: number }
  players: {
    player: { id: number }
    statistics: {
      games?: { minutes: number | null; rating: string | null; substitute?: boolean | null }
      goals?: { total: number | null; assists: number | null }
      cards?: { yellow: number | null; red: number | null }
    }[]
  }[]
}[]

export type WeeklyMatch = {
  fixtureId: number
  date: string
  leagueName: string
  homeName: string
  awayName: string
  homeLogo: string
  awayLogo: string
  homeScore: number | null
  awayScore: number | null
  isHome: boolean
  opponentName: string
  result: "W" | "D" | "L" | null
  // 이 경기에 선수 개인 기록 데이터가 제공됐는지 (일부 컵대회/하위리그는 제공 안 됨)
  statsAvailable: boolean
  // 선수 개인 기록. statsAvailable인데 played=false면 명단 제외/결장
  played: boolean
  minutes: number | null
  rating: number | null
  goals: number
  assists: number
  yellow: number
  red: number
  substitute: boolean | null
  // matchLinkHref에 넘기기 위한 원본 형태
  slugSource: { fixture: { id: number; date: string }; teams: { home: { name: string }; away: { name: string } } }
}

export type UpcomingMatch = {
  fixtureId: number
  date: string
  leagueName: string
  homeName: string
  awayName: string
  homeLogo: string
  awayLogo: string
  isHome: boolean
  opponentName: string
  slugSource: WeeklyMatch["slugSource"]
}

export type PlayerWeek = {
  player: KoreanPlayer
  teamNameKo: string
  recent: WeeklyMatch[] // 최근 7일 내 종료 경기 (최신순)
  next: UpcomingMatch | null
}

export function koTeam(name: string): string {
  return TEAM_NAME_KO[name] ?? name
}

export function koLeague(name: string): string {
  return LEAGUE_NAME_KO[name] ?? name
}

async function getTeamFixtures(teamId: number, kind: "last" | "next", count: number): Promise<RawFixture[]> {
  try {
    const data = await apiFetch(`/fixtures?team=${teamId}&${kind}=${count}`, TEAM_FIXTURES_TTL)
    return Array.isArray(data) ? (data as RawFixture[]) : []
  } catch (err) {
    console.error(`koreanWeekly: 팀 ${teamId} ${kind} 경기 조회 실패:`, err instanceof Error ? err.message : err)
    return []
  }
}

async function getFixturePlayers(fixtureId: number): Promise<RawFixturePlayers> {
  try {
    const data = await apiFetch(`/fixtures/players?fixture=${fixtureId}`, FIXTURE_PLAYERS_TTL)
    return Array.isArray(data) ? (data as RawFixturePlayers) : []
  } catch (err) {
    console.error(`koreanWeekly: 경기 ${fixtureId} 선수 기록 조회 실패:`, err instanceof Error ? err.message : err)
    return []
  }
}

function slugSourceOf(fx: RawFixture): WeeklyMatch["slugSource"] {
  return {
    fixture: { id: fx.fixture.id, date: fx.fixture.date },
    teams: { home: { name: fx.teams.home.name }, away: { name: fx.teams.away.name } },
  }
}

// days: 최근 며칠 이내 종료 경기를 "이번 주"로 볼지
export const getKoreanPlayersWeek = cache(async function getKoreanPlayersWeek(days = 7): Promise<PlayerWeek[]> {
  const teamIds = [...new Set(KOREAN_PLAYERS_ABROAD.map((p) => p.teamId).filter(Boolean))]

  // 팀별 최근/다음 경기를 한 번씩만 조회 (같은 팀 선수가 여럿이어도 중복 호출 없음)
  const teamData = new Map<number, { last: RawFixture[]; next: RawFixture[] }>()
  await Promise.all(
    teamIds.map(async (teamId) => {
      const [last, next] = await Promise.all([
        getTeamFixtures(teamId, "last", 3),
        getTeamFixtures(teamId, "next", 1),
      ])
      teamData.set(teamId, { last, next })
    })
  )

  const since = Date.now() - days * 24 * 60 * 60 * 1000
  const recentFixtureIds = new Set<number>()
  for (const { last } of teamData.values()) {
    for (const fx of last) {
      // 클럽 친선경기는 개인 기록도 없고 의미도 적어서 "이번 주 활약"에서 뺀다
      // (2026-10-10, A매치 휴식기에 친선경기만 잡혀 전원 "미출전"으로 보이던 문제)
      const isFriendly = /friendl/i.test(fx.league.name)
      if (!isFriendly && getMatchPhase(fx.fixture.status.short) === "finished" && new Date(fx.fixture.date).getTime() >= since) {
        recentFixtureIds.add(fx.fixture.id)
      }
    }
  }

  const fixturePlayers = new Map<number, RawFixturePlayers>()
  await Promise.all(
    [...recentFixtureIds].map(async (id) => {
      fixturePlayers.set(id, await getFixturePlayers(id))
    })
  )

  return KOREAN_PLAYERS_ABROAD.map((player) => {
    const data = teamData.get(player.teamId) ?? { last: [], next: [] }

    const recent: WeeklyMatch[] = data.last
      .filter((fx) => recentFixtureIds.has(fx.fixture.id))
      .sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime())
      .map((fx) => {
        const isHome = fx.teams.home.id === player.teamId
        const my = isHome ? fx.teams.home : fx.teams.away
        const opp = isHome ? fx.teams.away : fx.teams.home
        const result: WeeklyMatch["result"] = my.winner === true ? "W" : opp.winner === true ? "L" : my.winner === null && opp.winner === null && fx.goals.home !== null ? "D" : null

        let stat: RawFixturePlayers[number]["players"][number]["statistics"][number] | null = null
        const teamsStats = fixturePlayers.get(fx.fixture.id) ?? []
        const statsAvailable = teamsStats.some((t) => (t.players ?? []).length > 0)
        for (const team of teamsStats) {
          const found = (team.players ?? []).find((p) => p.player.id === player.id)
          if (found) {
            stat = found.statistics?.[0] ?? null
            break
          }
        }
        const minutes = stat?.games?.minutes ?? null
        const ratingNum = stat?.games?.rating ? Number(stat.games.rating) : null

        return {
          fixtureId: fx.fixture.id,
          date: fx.fixture.date,
          leagueName: fx.league.name,
          homeName: fx.teams.home.name,
          awayName: fx.teams.away.name,
          homeLogo: fx.teams.home.logo,
          awayLogo: fx.teams.away.logo,
          homeScore: fx.goals.home,
          awayScore: fx.goals.away,
          isHome,
          opponentName: opp.name,
          result,
          statsAvailable,
          played: (minutes ?? 0) > 0,
          minutes,
          rating: ratingNum !== null && Number.isFinite(ratingNum) ? ratingNum : null,
          goals: stat?.goals?.total ?? 0,
          assists: stat?.goals?.assists ?? 0,
          yellow: stat?.cards?.yellow ?? 0,
          red: stat?.cards?.red ?? 0,
          substitute: stat?.games?.substitute ?? null,
          slugSource: slugSourceOf(fx),
        }
      })

    const nextFx = data.next.find((fx) => getMatchPhase(fx.fixture.status.short) !== "finished") ?? null
    const next: UpcomingMatch | null = nextFx
      ? (() => {
          const isHome = nextFx.teams.home.id === player.teamId
          return {
            fixtureId: nextFx.fixture.id,
            date: nextFx.fixture.date,
            leagueName: nextFx.league.name,
            homeName: nextFx.teams.home.name,
            awayName: nextFx.teams.away.name,
            homeLogo: nextFx.teams.home.logo,
            awayLogo: nextFx.teams.away.logo,
            isHome,
            opponentName: (isHome ? nextFx.teams.away : nextFx.teams.home).name,
            slugSource: slugSourceOf(nextFx),
          }
        })()
      : null

    return { player, teamNameKo: koTeam(player.teamName), recent, next }
  })
})

// "10월 12일(일) 오후 11:30" 형식 (한국 시간)
export function formatKickoffKst(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short" })
  const time = d.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit" })
  return `${date} ${time}`
}
