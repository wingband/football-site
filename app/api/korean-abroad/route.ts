import { NextResponse } from "next/server"
import { KOREAN_PLAYERS_ABROAD } from "@/lib/koreanPlayersAbroad"
import { saveCachedPlayerStat, getCachedPlayerStat } from "@/lib/playerStatCache"

const NATIONAL_KW = ["World Cup", "AFC", "Asian", "Olympic", "Friendlies", "Qualification", "Nations", "Copa", "EURO"]

function getClubStat(statistics: { team: { name: string; logo: string }; league: { name: string; logo?: string }; games: { appearences: number | null; minutes: number | null; rating: string | null }; goals: { total: number | null; assists: number | null }; shots?: { total: number | null; on: number | null }; passes?: { accuracy: number | null } }[]) {
  // API-Football은 선수 시즌 통계를 대회별로(리그/챔스/국내컵 등) 따로 쪼개서 배열로
  // 준다. 예전엔 국가대표 경기만 걸러내고 배열의 첫 번째 항목을 그냥 집었는데,
  // API가 리그를 먼저 준다는 보장이 없어서 하필 컵대회/챔스 항목이 앞에 오면
  // 시즌 내내 쌓은 리그 기록 대신 그 대회 한두 경기 기록(대부분 0골)이 잡혔다
  // (2026-09-19, 이강인이 실제 라리가 2골인데 UCL 1경기 0골로 표시됨 확인 — 김민재/
  // 이재성/정우영/옌스 카스트로프도 전부 같은 증상). 시즌 중엔 리그가 항상 다른
  // 대회보다 압도적으로 출전시간이 많을 수밖에 없으므로, 이름으로 컵대회를 걸러내는
  // 취약한 방식 대신 "출전시간이 가장 긴 대회 = 주 무대"로 판단한다
  const clubStats = statistics.filter((s) => !NATIONAL_KW.some((kw) => s.league.name.includes(kw)))
  if (clubStats.length === 0) return null
  return clubStats.reduce((best, cur) =>
    (cur.games.minutes ?? 0) > (best.games.minutes ?? 0) ? cur : best
  )
}

// 선수 13명 각각을 개별 호출하기 때문에(최악의 경우 선수당 2번, 시즌 폴백 포함)
// 한 번 갱신될 때마다 최대 26번의 API 호출이 발생한다. 30분(1800s)마다 갱신되면
// 방문자가 조금만 있어도 하루 수백~1000번씩 쿼터를 먹어서, 6시간으로 크게 늘린다.
// 선수 스탯은 그 선수 소속팀이 경기를 뛴 뒤에나 바뀌므로 이 정도 지연은 문제 없다
const PLAYER_STAT_REVALIDATE = 21600 // 6시간

async function fetchStat(playerId: number, season: number) {
  const res = await fetch(
    `https://v3.football.api-sports.io/players?id=${playerId}&season=${season}`,
    { headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! }, next: { revalidate: PLAYER_STAT_REVALIDATE } }
  )
  return res.json()
}

export async function GET() {
  const season = new Date().getFullYear()

  const players = await Promise.all(
    KOREAN_PLAYERS_ABROAD.map(async (player) => {
      try {
        let data = await fetchStat(player.id, season)
        if (!data.response?.[0]) {
          data = await fetchStat(player.id, season - 1)
        }

        const raw = data.response?.[0] ?? null
        let stat = null

        if (raw) {
          await saveCachedPlayerStat(player.id, raw)
          stat = getClubStat(raw.statistics ?? [])
        } else {
          const cached = await getCachedPlayerStat(player.id)
          if (cached) stat = getClubStat(cached.statistics ?? [])
        }

        return {
          id: player.id,
          name: player.name,
          // 팀/리그는 라이브 스탯에 있으면 그걸 우선 쓴다 — 하드코딩된 값은 이적 직후처럼
          // 아직 API에 새 시즌 스탯이 안 잡힌 경우에만 쓰는 폴백이다. 이렇게 해야 앞으로
          // 이적이 생겨도 이 목록을 수동으로 안 고쳐도 자동으로 따라잡는다
          // (2026-09-08, 황희찬 울버햄튼→샬케 이적이 반영 안 됐던 것 계기로 수정)
          teamName: stat?.team?.name ?? player.teamName,
          teamLogo: stat?.team?.logo ?? player.teamLogo,
          league: stat?.league?.name ?? player.league,
          leagueLogo: stat?.league?.logo ?? player.leagueLogo,
          tier: player.tier,
          goals: stat?.goals.total ?? 0,
          assists: stat?.goals.assists ?? 0,
          apps: stat?.games.appearences ?? 0,
          minutes: stat?.games.minutes ?? 0,
          rating: stat?.games.rating ?? null,
        }
      } catch {
        return {
          id: player.id,
          name: player.name,
          teamName: player.teamName,
          teamLogo: player.teamLogo,
          league: player.league,
          leagueLogo: player.leagueLogo,
          tier: player.tier,
          goals: 0,
          assists: 0,
          apps: 0,
          minutes: 0,
          rating: null,
        }
      }
    })
  )

  // 정렬: tier → 출전시간(minutes) 내림차순 → 출전경기수(apps) 내림차순
  // 출전 시간이 많을수록 최근에 많이 뛴 선수 = 위에 표시
  const sorted = [...players].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier
    const minutesA = a.minutes ?? 0
    const minutesB = b.minutes ?? 0
    if (minutesB !== minutesA) return minutesB - minutesA
    return (b.apps ?? 0) - (a.apps ?? 0)
  })

  return NextResponse.json({ players: sorted }, {
    headers: { "Cache-Control": `s-maxage=${PLAYER_STAT_REVALIDATE}, stale-while-revalidate=3600` },
  })
}
