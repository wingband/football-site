// 스코프 안(5대리그+UEFA+K/J리그+챔피언십/2.분데스리가/벨기에) 리그의 팀 데이터를
// 뒤에서 미리 채워두는 크론. 방문자가 처음 보는 팀이라도 이미 DB에 있어서
// API 호출이 0번이 되게 하는 게 목적 — DB 우선 캐시 마지막 단계.
// (2026-09-18) team-info/team-league/team-fixtures/team-injuries/team-coachs는
// 이미 lib/teamData.ts에서 DB 우선 캐시로 전환돼 있어서, 여기선 그 함수들을
// 그냥 호출만 해주면 된다 — 신선하면 API를 안 부르고, 오래됐으면 딱 1번만 갱신한다
import { NextRequest, NextResponse } from "next/server"
import { getCachedOrFetch } from "@/lib/apiCache"
import { SCOPE_LEAGUES } from "@/lib/scope"
import { getStandings } from "@/lib/matchApi"
import {
  getTeamInfo,
  getTeamCurrentLeague,
  getTeamSeasonFixtures,
  getTeamInjuries,
  getTeamCoach,
} from "@/lib/teamData"
import { getSeasonYear } from "@/lib/season"

// 한 번 실행에 여러 리그 x 팀을 순회하다 보면 시간이 걸려서 기본 10초 제한보다 늘려둠
export const maxDuration = 300

// 리그마다 "시즌을 세는 방식"이 다른데(K리그/J리그는 달력 연도, 나머지는 8월~7월),
// getSeasonYear가 그걸 국가명으로 판단하므로 리그별 대표 국가를 붙여준다
const LEAGUE_COUNTRY: Record<number, string> = {
  292: "southkorea", // K League 1
  98: "japan",       // J1 League
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 팀 목록 조회는 이후 팀 5개 API(정보/현재리그/일정/부상/감독)의 시작점이라,
// 여기서 429를 맞으면 리그 하나가 통째로 0팀이 되어버린다. 3초 대기 후 한 번만
// 재시도한다 (2026-09-18, UCL이 5대리그 직후 처리되며 API 한도를 소진해
// 이후 7개 리그가 전부 팀 목록 조회부터 실패하는 것 확인).
async function getLeagueTeamIds(leagueId: number, season: number): Promise<number[]> {
  const path = `/teams?league=${leagueId}&season=${season}`
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const teams = await getCachedOrFetch<{ team: { id: number } }[]>(path, 604800, async () => {
        const res = await fetch(`https://v3.football.api-sports.io${path}`, {
          headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
        })
        if (!res.ok) throw new Error(`리그 팀 목록 응답 오류 (${res.status})`)
        const data = await res.json()
        return data.response ?? []
      })
      return teams.map((t) => t.team.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`getLeagueTeamIds 실패 (league=${leagueId}, attempt=${attempt + 1}):`, message)
      if (message.includes("429") && attempt === 0) {
        await sleep(3000)
        continue
      }
      return []
    }
  }
  return []
}

async function warmTeam(teamId: number, season: number) {
  const id = String(teamId)
  await Promise.allSettled([
    getTeamInfo(id),
    getTeamCurrentLeague(id),
    getTeamSeasonFixtures(id, season),
    getTeamInjuries(id, season),
    getTeamCoach(id, teamId),
  ])
}

// 배열을 size 단위로 나눠서, 청크 안에서는 동시에 처리하고 청크끼리는 순서대로 처리.
// API-Football을 한꺼번에 너무 많이 두드리지 않으면서도 전체 속도를 낸다
async function processInChunks<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.allSettled(items.slice(i, i + size).map(fn))
    await sleep(200) // API-Football 순간 요청 폭주로 인한 429 방지
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const expected = `Bearer ${process.env.CRON_SECRET}`
  const authHeaderTrimmed = authHeader?.trim()
  const expectedTrimmed = expected.trim()
  console.log("[cron-auth-debug-v2]", {
    receivedLen: authHeader?.length ?? 0,
    expectedLen: expected.length,
    receivedTrimmedLen: authHeaderTrimmed?.length ?? 0,
    expectedTrimmedLen: expectedTrimmed.length,
    matchesRaw: authHeader === expected,
    matchesTrimmed: authHeaderTrimmed === expectedTrimmed,
  })
  if (process.env.CRON_SECRET && authHeaderTrimmed !== expectedTrimmed) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 })
  }

  const summary: { league: string; season: number; teams: number }[] = []

  // 대륙별 컵대회(UCL/UEL/UECL)는 팀 수가 가장 많아 API 할당량을 많이 먹는다.
  // 5대리그 + 해외파 소속 리그(K리그/J리그/챔피언십/2.분데스리가/벨기에)를
  // 먼저 채우고, 컵대회는 맨 뒤로 미뤄서 한도를 넘기더라도 더 중요한 리그는
  // 이미 채워진 상태가 되게 한다.
  const CONTINENTAL_CUP_IDS = new Set([2, 3, 4])
  const processOrder = [...SCOPE_LEAGUES].sort(
    (a, b) => Number(CONTINENTAL_CUP_IDS.has(a.id)) - Number(CONTINENTAL_CUP_IDS.has(b.id))
  )

  for (const league of processOrder) {
    const country = LEAGUE_COUNTRY[league.id] ?? "england"
    const season = getSeasonYear(country)

    // 리그 순위표 자체도 미리 갱신
    await getStandings(league.id, season)

    const teamIds = await getLeagueTeamIds(league.id, season)
    await processInChunks(teamIds, 3, (teamId) => warmTeam(teamId, season))

    summary.push({ league: league.name, season, teams: teamIds.length })
  }

  return NextResponse.json({ ok: true, summary })
}
