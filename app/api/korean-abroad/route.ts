import { NextResponse } from "next/server"
import { KOREAN_PLAYERS_ABROAD } from "@/lib/koreanPlayersAbroad"
import { saveCachedPlayerStat, getCachedPlayerStat } from "@/lib/playerStatCache"
import { fetchApiFootball } from "@/lib/apiFootballClient"

const NATIONAL_KW = ["World Cup", "AFC", "Asian", "Olympic", "Friendlies", "Qualification", "Nations", "Copa", "EURO"]

function getClubStat(statistics: { team: { name: string; logo: string }; league: { name: string; logo?: string }; games: { appearences: number | null; minutes: number | null; rating: string | null }; goals: { total: number | null; assists: number | null }; shots?: { total: number | null; on: number | null }; passes?: { accuracy: number | null } }[]) {
  const clubStats = statistics.filter((s) => !NATIONAL_KW.some((kw) => s.league.name.includes(kw)))
  if (clubStats.length === 0) return null
  return clubStats.reduce((best, cur) =>
    (cur.games.minutes ?? 0) > (best.games.minutes ?? 0) ? cur : best
  )
}

// 선수 13명 각각을 개별 호출하기 때문에(최악의 경우 선수당 2번, 시즌 폴백 포함)
// 한 번 갱신될 때마다 최대 26번의 API 호출이 발생한다. 30분(1800s)마다 갱신되면
// 방문자가 조금만 있어도 하루 수백~1000번씩 쿼터를 먹어서, 6시간으로 크게 늘린다.
const PLAYER_STAT_REVALIDATE = 21600 // 6시간

// (2026-09-20) 기존엔 fetch를 직접 호출하고 errors 필드를 체크하지 않아서, API
// 레이트리밋/쿼터초과로 HTTP 200 + errors가 와도 "이번 시즌 기록 없음"으로 오인해
// season-1로 잘못 폴백하거나 0으로 표시되는 문제가 있었다(그리고 그 잘못된 결과가
// Next의 6시간 fetch 캐시에 그대로 박제됨). fetchApiFootball()로 통합해 errors
// 체크/재시도를 적용한다. 여기서 실패는 null로 처리해 기존 폴백 경로
// (전 시즌 재조회 → DB에 저장해둔 마지막 정상 스탯)를 그대로 탄다.
async function fetchStat(playerId: number, season: number): Promise<any | null> {
  try {
    const response = await fetchApiFootball(`/players?id=${playerId}&season=${season}`, {
      revalidate: PLAYER_STAT_REVALIDATE,
    })
    return response[0] ?? null
  } catch {
    return null
  }
}

export async function GET() {
  const season = new Date().getFullYear()

  const players = await Promise.all(
    KOREAN_PLAYERS_ABROAD.map(async (player) => {
      try {
        // (2026-09-22) 예전엔 이번 시즌(season) 조회가 일시적으로 실패하면(타임아웃/
        // 레이트리밋 등) 곧장 작년(season-1) 시즌으로 폴백했다. 문제는 작년 시즌
        // 데이터가 "부족한 데이터"가 아니라 완전한 풀시즌 기록이라 겉보기엔 멀쩡해서,
        // 시즌 중 이적한 선수(이강인: PSG→Atletico)의 경우 작년 소속팀(PSG) 27경기
        // 기록이 "이번 시즌 현재 소속팀 기록"인 것처럼 그대로 DB에 저장돼버렸다.
        // 이번 시즌 조회 실패 시엔 작년 시즌으로 바로 넘어가지 않고, 먼저 기존 DB
        // 캐시(지난 성공 시점의 이번 시즌 데이터일 가능성이 높음)를 우선 쓴다.
        // 작년 시즌 폴백은 DB 캐시조차 전혀 없는 신규 등록 선수일 때만 최후 수단으로 쓴다.
        let raw = await fetchStat(player.id, season)
        let stat = null

        if (raw) {
          await saveCachedPlayerStat(player.id, raw)
          stat = getClubStat(raw.statistics ?? [])
        } else {
          const cached = await getCachedPlayerStat(player.id)
          if (cached) {
            stat = getClubStat(cached.statistics ?? [])
          } else {
            raw = await fetchStat(player.id, season - 1)
            if (raw) {
              await saveCachedPlayerStat(player.id, raw)
              stat = getClubStat(raw.statistics ?? [])
            }
          }
        }

        return {
          id: player.id,
          name: player.name,
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
