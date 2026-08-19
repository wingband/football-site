import { NextRequest, NextResponse } from "next/server"
import { generateMatchArticle } from "@/lib/generateArticle"
import { saveArticle, slugify } from "@/lib/articles"
import { MOCK_FIXTURES } from "@/lib/mockData"

// API 호출/AI 비용을 아끼기 위해, 기사를 만들 대상은 이 리그들의 "종료된 경기"로만 제한
const TARGET_LEAGUE_IDS = [39, 140, 78, 135, 61, 253, 292, 98]
// 하루에 생성할 기사 최대 개수 (한도 초과 방지용 안전장치)
const MAX_ARTICLES_PER_RUN = 5

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

  const today = new Date().toISOString().split("T")[0]

  let fixtures: typeof MOCK_FIXTURES = []
  if (process.env.USE_MOCK_DATA === "true") {
    fixtures = MOCK_FIXTURES
  } else {
    fixtures = await apiFetch(`/fixtures?date=${today}`)
  }

  // 지정한 주요 리그 + 종료된 경기만 추려서, 앞에서부터 최대 개수만큼만 처리
  const targets = fixtures
    .filter((f) => TARGET_LEAGUE_IDS.includes(f.league.id))
    .filter((f) => f.fixture.status.short === "FT")
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