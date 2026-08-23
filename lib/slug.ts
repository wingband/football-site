// SEO용 경기 URL slug
// 형식: {home-team}-vs-{away-team}-{YYYYMMDD}-{fixtureId}
// 끝에 fixtureId를 붙여두면 slug만 보고 경기를 특정할 수 있어서, URL을 fixture로
// 되돌릴 때 DB/API 역조회가 필요 없음.

export type MatchSlugSource = {
  fixture: { id: number; date: string }
  teams: {
    home: { name: string }
    away: { name: string }
  }
}

// 팀 이름 → URL 조각. 발음기호는 풀어서 ASCII로 (München → munchen).
// ASCII로 남는 글자가 하나도 없는 이름(예: 한글 팀명)은 "team"으로 대체 —
// 어차피 slug 끝의 id로 경기를 찾으므로 URL은 계속 동작한다.
export function slugifyTeamName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  return slug || "team"
}

// 킥오프 날짜를 UTC 기준 YYYYMMDD로. 로컬 타임존을 쓰면 서버와 클라이언트에서
// slug가 달라져 정규 URL이 흔들리므로 반드시 UTC로 고정한다.
export function slugifyDate(date: string): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return "00000000"
  return d.toISOString().slice(0, 10).replace(/-/g, "")
}

export function buildMatchSlug(match: MatchSlugSource): string {
  return [
    slugifyTeamName(match.teams.home.name),
    "vs",
    slugifyTeamName(match.teams.away.name),
    slugifyDate(match.fixture.date),
    String(match.fixture.id),
  ].join("-")
}

export function matchHref(match: MatchSlugSource): string {
  return `/matches/${buildMatchSlug(match)}`
}

// slug → fixture id. 끝에 붙은 숫자를 그대로 읽는다.
// 팀명/날짜가 없는 예전 숫자 URL(/matches/1234)도 통과시켜서, 페이지에서
// 정규 slug로 308 리다이렉트할 수 있게 한다.
export function parseFixtureId(slug: string): number | null {
  const matched = /(?:^|-)(\d+)$/.exec(slug)
  if (!matched) return null
  const id = Number(matched[1])
  return Number.isSafeInteger(id) && id > 0 ? id : null
}
