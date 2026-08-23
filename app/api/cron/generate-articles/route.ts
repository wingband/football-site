import { NextRequest, NextResponse } from "next/server"
import { generateMatchArticle } from "@/lib/generateArticle"
import { saveArticle, slugify } from "@/lib/articles"
import { MOCK_FIXTURES } from "@/lib/mockData"

// API 호출/AI 비용을 아끼기 위해, 기사를 만들 대상은 이 리그들의 "종료된 경기"로만 제한
const TARGET_LEAGUE_IDS = [39, 140, 78, 135, 61, 2, 3, 253, 292, 98]
// 리그 우선순위 (낮을수록 먼저)
const LEAGUE_PRIORITY: Record<number, number> = {
  39: 1,   // Premier League
  2:  2,   // Champions League
  140: 3,  // La Liga
  78: 4,   // Bundesliga
  135: 5,  // Serie A
  61: 6,   // Ligue 1
  3:  7,   // Europa League
  292: 8,  // K League
  98: 9,   // J League
  253: 10, // MLS
}
// 하루에 생성할 기사 최대 개수
const MAX_ARTICLES_PER_RUN = 10

async function apiFetch(path: string) {
  const res = await fetch(`https://v3.football.api-sports.io${path}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
  })
  const data = await res.json()
  return data.response
}

export async function GET(req: NextRequest) {
  // Vercel Cron이 보내는 요청인지 확인하는 보안 체크.
  // CRON_SECRET 환경변수를 설정해두면, 배포 후 Vercel이 이 값을 담아 자동으로 요청을 보냅니다.
  const authHeader = req.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 })
  }

  // 테스트용: ?date=2026-08-17 처럼 붙이면 그 날짜 기준으로 실행.
  // 실제 Vercel Cron은 파라미터 없이 호출하므로 평소엔 항상 "오늘"이 사용됨
  const dateParam = req.nextUrl.searchParams.get("date")
  const today = dateParam ?? new Date().toISOString().split("T")[0]

  let fixtures: typeof MOCK_FIXTURES = []
  if (process.env.USE_MOCK_DATA === "true") {
    fixtures = MOCK_FIXTURES
  } else {
    // 오늘 + 어제 경기 모두 가져오기 (한국 시간대상 새벽 경기 포함)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split("T")[0]

    const [todayFixtures, yesterdayFixtures] = await Promise.all([
      apiFetch(`/fixtures?date=${today}`),
      apiFetch(`/fixtures?date=${yesterdayStr}`),
    ])
    fixtures = [...(todayFixtures ?? []), ...(yesterdayFixtures ?? [])]
  }

  // 주요 리그 + 종료된 경기 필터 후 우선순위 정렬
  const targets = fixtures
    .filter((f) => TARGET_LEAGUE_IDS.includes(f.league.id))
    .filter((f) => f.fixture.status.short === "FT")
    .sort((a, b) => {
      const pa = LEAGUE_PRIORITY[a.league.id] ?? 99
      const pb = LEAGUE_PRIORITY[b.league.id] ?? 99
      return pa - pb
    })
    .slice(0, MAX_ARTICLES_PER_RUN)

  const created: string[] = []

  for (const match of targets) {
    let statsSummary = "통계 데이터 없음"
    let eventsSummary = "이벤트 데이터 없음"

    if (process.env.USE_MOCK_DATA !== "true") {
      const stats = await apiFetch(`/fixtures/statistics?fixture=${match.fixture.id}`)
      if (stats?.length === 2) {
        statsSummary = stats[0].statistics
          .map((s: { type: string; value: unknown }, i: number) =>
            `${s.type}: ${s.value ?? 0} vs ${stats[1].statistics[i]?.value ?? 0}`
          )
          .join(", ")
      }

      const events = await apiFetch(`/fixtures/events?fixture=${match.fixture.id}`)
      if (events?.length) {
        eventsSummary = events
          .map((e: { time: { elapsed: number }; type: string; player: { name: string } }) =>
            `${e.time.elapsed}분 ${e.type} (${e.player.name})`
          )
          .join(", ")
      }
    }

    const content = await generateMatchArticle({
      homeTeam: match.teams.home.name,
      awayTeam: match.teams.away.name,
      homeScore: match.goals.home,
      awayScore: match.goals.away,
      leagueName: match.league.name,
      statsSummary,
      eventsSummary,
    })

    if (!content) continue

    const slug = slugify(match.teams.home.name, match.teams.away.name, match.fixture.id)

    await saveArticle({
      slug,
      title: `${match.teams.home.name} ${match.goals.home}:${match.goals.away} ${match.teams.away.name} 경기 리뷰`,
      matchId: match.fixture.id,
      leagueName: match.league.name,
      homeTeam: match.teams.home.name,
      awayTeam: match.teams.away.name,
      homeScore: match.goals.home,
      awayScore: match.goals.away,
      content,
      createdAt: new Date().toISOString(),
    })

    created.push(slug)
  }

  return NextResponse.json({ ok: true, createdCount: created.length, slugs: created })
}