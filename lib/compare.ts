// 선수 비교 페이지(/compare)가 쓰는 공용 로직 — 이름 표기, 정규 URL, 비교 지표 정의
import { KOREAN_PLAYERS_ABROAD } from "@/lib/koreanPlayersAbroad"
import type { PlayerSeasonStat } from "@/lib/playerData"

// API-Football은 선수 이름을 로마자로만 준다 ("Heung-Min Son").
// 해외파 목록에 있는 선수는 한국어 이름으로 바꿔서 보여줌 (타이틀·본문 공통)
const KOREAN_NAME_BY_ID = new Map(KOREAN_PLAYERS_ABROAD.map((p) => [p.id, p.name]))

export function displayPlayerName(id: number, apiName: string): string {
  return KOREAN_NAME_BY_ID.get(id) ?? apiName
}

// 비교는 순서에 의미가 없어서 (A,B)와 (B,A)가 완전히 같은 화면이다.
// 검색엔진에 중복 페이지로 보이지 않도록 "id 오름차순"을 정규 URL로 정한다
export function compareHref(a: number, b: number): string {
  const [lo, hi] = a <= b ? [a, b] : [b, a]
  return `/compare?player1=${lo}&player2=${hi}`
}

// 사이트맵(XML)에 넣을 주소. Next는 <loc>에 url을 그대로 문자열 보간하고
// XML 이스케이프를 해주지 않으므로(next/dist/build/webpack/loaders/metadata/resolve-route-data.js),
// 쿼리스트링의 &를 여기서 &amp;로 바꿔줘야 한다. 안 그러면 사이트맵 전체가 잘못된 XML이 됨
export function compareSitemapPath(a: number, b: number): string {
  return compareHref(a, b).replace(/&/g, "&amp;")
}

// 사이트맵용 조합. 13명이면 13*12/2 = 78개 (순서만 다른 중복은 제외)
export function koreanComparePairs(): [number, number][] {
  const ids = KOREAN_PLAYERS_ABROAD.map((p) => p.id).sort((x, y) => x - y)
  const pairs: [number, number][] = []
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      pairs.push([ids[i], ids[j]])
    }
  }
  return pairs
}

// 국가대표/친선 경기를 뺀 "클럽 주력 대회" 스탯 하나를 고른다.
// 선수 상세 페이지(app/players/[id])와 같은 규칙 — 두 화면의 숫자가 달라 보이면 안 됨
const NATIONAL_KEYWORDS = ["World Cup", "AFC", "Asian", "Olympic", "Friendlies", "Qualification", "Nations"]

export function pickPrimaryStat(statistics: PlayerSeasonStat[]): PlayerSeasonStat | null {
  if (statistics.length === 0) return null
  const club = statistics.filter(
    (s) => !NATIONAL_KEYWORDS.some((kw) => s.league.name.includes(kw))
  )
  return (club.length > 0 ? club : statistics)
    .slice()
    .sort((a, b) => (b.games.appearences ?? 0) - (a.games.appearences ?? 0))[0] ?? null
}

// 비교 지표 정의.
// 값이 큰 쪽을 골드로 강조하는 화면이라, "많을수록 좋은" 지표만 넣는다.
// (카드처럼 적은 게 좋은 지표를 섞으면 강조색이 거꾸로 읽힘)
export type CompareMetric = {
  label: string
  // 비교에 쓰는 숫자. 값이 없으면 null
  value: (s: PlayerSeasonStat) => number | null
  // 화면에 보여줄 문자열
  format: (v: number) => string
  // 소수점 비교가 필요한 지표(평점 등) 구분용
  highlight?: boolean
}

const pct = (v: number) => `${Math.round(v)}%`
const num = (v: number) => v.toLocaleString("ko-KR")

export const COMPARE_METRICS: CompareMetric[] = [
  {
    label: "평점",
    value: (s) => (s.games.rating ? parseFloat(s.games.rating) : null),
    format: (v) => v.toFixed(2),
    highlight: true,
  },
  { label: "출전 경기", value: (s) => s.games.appearences, format: num },
  { label: "선발 출전", value: (s) => s.games.lineups, format: num },
  { label: "출전 시간", value: (s) => s.games.minutes, format: (v) => `${num(v)}분` },
  { label: "골", value: (s) => s.goals.total, format: num, highlight: true },
  { label: "도움", value: (s) => s.goals.assists, format: num, highlight: true },
  {
    label: "공격 포인트",
    value: (s) => (s.goals.total ?? 0) + (s.goals.assists ?? 0),
    format: num,
    highlight: true,
  },
  {
    // 출전 시간이 다른 선수를 같은 기준으로 보려면 90분당 환산이 필요함
    label: "90분당 공격 포인트",
    value: (s) => {
      const minutes = s.games.minutes ?? 0
      if (minutes < 90) return null
      return ((s.goals.total ?? 0) + (s.goals.assists ?? 0)) / (minutes / 90)
    },
    format: (v) => v.toFixed(2),
    highlight: true,
  },
  { label: "슈팅", value: (s) => s.shots.total, format: num },
  { label: "유효 슈팅", value: (s) => s.shots.on, format: num },
  { label: "키패스", value: (s) => s.passes.key, format: num },
  { label: "패스 성공률", value: (s) => s.passes.accuracy, format: pct },
  { label: "드리블 시도", value: (s) => s.dribbles.attempts, format: num },
  { label: "드리블 성공", value: (s) => s.dribbles.success, format: num },
  {
    label: "드리블 성공률",
    value: (s) => {
      const a = s.dribbles.attempts ?? 0
      if (a === 0) return null
      return ((s.dribbles.success ?? 0) / a) * 100
    },
    format: pct,
  },
  { label: "경합 승리", value: (s) => s.duels.won, format: num },
  { label: "태클", value: (s) => s.tackles.total, format: num },
  { label: "인터셉트", value: (s) => s.tackles.interceptions, format: num },
]

// 두 값 중 큰 쪽만 골드로 강조. 같으면 어느 쪽도 강조하지 않고,
// 한쪽만 값이 있으면 있는 쪽을 강조한다
export function compareValueClass(mine: number | null, theirs: number | null): string {
  if (mine === null) return "text-floodlight/30"
  if (theirs === null) return "text-score-amber font-bold"
  if (mine > theirs) return "text-score-amber font-bold"
  if (mine < theirs) return "text-floodlight/60"
  return "text-floodlight/90"
}
