// 스코프 안(5대리그+UEFA+K/J리그+챔피언십/2.분데스리가/벨기에) 리그의 팀 데이터를
// 뒤에서 미리 채워두는 크론. 방문자가 처음 보는 팀이라도 이미 DB에 있어서
// API 호출이 0번이 되게 하는 게 목적 — DB 우선 캐시 마지막 단계.
// (2026-09-18) team-info/team-league/team-fixtures/team-injuries/team-coachs는
// 이미 lib/teamData.ts에서 DB 우선 캐시로 전환돼 있어서, 여기선 그 함수들을
// 그냥 호출만 해주면 된다 — 신선하면 API를 안 부르고, 오래됐으면 딱 1번만 갱신한다
import { NextRequest, NextResponse } from "next/server"
import { getCachedOrFetch } from "@/lib/apiCache"
import { SCOPE_LEAGUES, MAJOR_NATIONAL_TEAM_IDS } from "@/lib/scope"
import { KOREAN_PLAYERS_ABROAD } from "@/lib/koreanPlayersAbroad"
import { getPlayerDataWithFallback, getPlayerTransfers, getTrophies, getSidelined } from "@/lib/playerData"
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

// 선수 페이지(app/players/[id]/page.tsx)가 SSR에서 실제로 부르는 4개만 예열한다.
// 경력/최근경기 탭은 클라이언트 마운트 시점에만 지연 로딩되는 별도 API(/api/players/[id]/extra)라
// 우선순위상 여기선 뺐다 (2026-09-18)
async function warmPlayer(playerId: number, season: number) {
  const id = String(playerId)
  await Promise.allSettled([
    getPlayerDataWithFallback(id, season),
    getPlayerTransfers(id),
    getTrophies(id),
    getSidelined(id),
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
  const authHeader = req.headers.get("authorization")?.trim()
  const expected = `Bearer ${process.env.CRON_SECRET}`.trim()
  if (process.env.CRON_SECRET && authHeader !== expected) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 })
  }

  const summary: { league: string; season: number; teams: number }[] = []

  // (2026-09-19) UEFA 3개 대회(UCL/UEL/UECL)는 예선 탈락팀까지 전부 "참가팀"으로
  // 잡혀서 322개 팀(UCL 81 + UEL 76 + UECL 165)이나 된다. 팀당 5콜씩 6시간마다
  // 예열하다 보니 이게 하루 API 한도(7,500) 초과의 핵심 원인이었다
  // (2026-09-19, 정상적인 하루에도 12,600건 이상 소진되는 것 확인 —
  // 오늘 반복 테스트 때문이 아니라 매일 구조적으로 초과되고 있었음). 아무도
  // 안 볼 예선 탈락팀 수백 개를 미리 채워두는 건 낭비이므로, 이 3개 대회는
  // 팀 예열 대상에서 완전히 제외한다. 실제 방문자가 이 팀 페이지를 클릭하면
  // 그때 캐시 미스로 정상 조회되고, 그 뒤로는 평소 TTL대로 캐시된다.
  const CONTINENTAL_CUP_IDS = new Set([2, 3, 848]) // 2=UCL, 3=UEL, 848=UECL (구 id:4는 오류였던 Euro Championship)
  const processOrder = SCOPE_LEAGUES.filter((l) => !CONTINENTAL_CUP_IDS.has(l.id))

  for (const league of processOrder) {
    const country = LEAGUE_COUNTRY[league.id] ?? "england"
    const season = getSeasonYear(country)

    // 리그 순위표 자체도 미리 갱신
    await getStandings(league.id, season)

    const teamIds = await getLeagueTeamIds(league.id, season)
    await processInChunks(teamIds, 3, (teamId) => warmTeam(teamId, season))

    summary.push({ league: league.name, season, teams: teamIds.length })
  }

  // 국가대표팀은 리그 소속이 없어서 위 루프로는 못 다룬다. 이름별로 미리
  // 확보해둔 팀 ID로 따로 예열한다. "시즌"은 리그처럼 8월~7월이 아니라
  // 국가대표 일정은 캘린더 연도 기준이라 그냥 올해를 쓴다.
  const nationalTeamSeason = new Date().getFullYear()
  const nationalTeamIds = Object.values(MAJOR_NATIONAL_TEAM_IDS)
  await processInChunks(nationalTeamIds, 3, (teamId) => warmTeam(teamId, nationalTeamSeason))
  summary.push({ league: "국가대표팀", season: nationalTeamSeason, teams: nationalTeamIds.length })

  // 한국인 해외파 선수 13명도 같은 방식으로 예열. 페이지 기본 시즌 계산과
  // 동일하게 getSeasonYear("England")를 쓴다 (app/players/[id]/page.tsx와 일치)
  const koreanPlayerSeason = getSeasonYear("England")
  const koreanPlayerIds = KOREAN_PLAYERS_ABROAD.map((p) => p.id)
  await processInChunks(koreanPlayerIds, 3, (playerId) => warmPlayer(playerId, koreanPlayerSeason))
  summary.push({ league: "해외파 선수", season: koreanPlayerSeason, teams: koreanPlayerIds.length })

  return NextResponse.json({ ok: true, summary })
}
