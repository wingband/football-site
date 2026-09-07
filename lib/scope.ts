// 사이트가 다루는 "관심 리그" 범위의 단일 소스.
// sitemap.ts와 팀 페이지(app/teams/[id]/*)가 이 목록을 공유해서,
// 사이트맵에서 숨긴 리그의 팀이라도 /teams/[id]로 직접(또는 봇이) 접근하면
// 여전히 API를 5번씩 호출하던 문제를 막는다 (2026-09-07 확인).
export const SCOPE_LEAGUES = [
  { id: 39, name: "Premier League" },
  { id: 140, name: "La Liga" },
  { id: 78, name: "Bundesliga" },
  { id: 135, name: "Serie A" },
  { id: 61, name: "Ligue 1" },
  { id: 2, name: "UEFA Champions League" },
  { id: 3, name: "UEFA Europa League" },
  { id: 4, name: "UEFA Europa Conference League" },
  { id: 292, name: "K League 1" },
  { id: 98, name: "J1 League" },
]

export const SCOPE_LEAGUE_IDS = new Set(SCOPE_LEAGUES.map((l) => l.id))

// 국가대표팀은 대륙별 예선마다 리그 ID가 달라서 리그 목록으로는 못 잡는다.
// 팀 이름으로 직접 매칭한다.
export const MAJOR_NATIONAL_TEAMS = new Set([
  "South Korea", "Brazil", "Argentina", "England", "France", "Germany",
  "Spain", "Portugal", "Netherlands", "Italy", "Belgium", "Japan", "Croatia",
])

// 팀이 사이트 스코프 안에 있는지 확인.
// - 현재 속한 리그(teamLeagueId)가 SCOPE_LEAGUE_IDS에 있으면 스코프 안
// - 또는 팀 이름이 주요 국가대표팀 목록에 있으면 스코프 안
export function isTeamInScope(teamLeagueId: number | null | undefined, teamName: string): boolean {
  if (teamLeagueId != null && SCOPE_LEAGUE_IDS.has(teamLeagueId)) return true
  if (MAJOR_NATIONAL_TEAMS.has(teamName)) return true
  return false
}
