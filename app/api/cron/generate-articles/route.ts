import { NextRequest, NextResponse } from "next/server"
import { generateMatchArticle } from "@/lib/generateArticle"
import { saveArticle, slugify, getArticleByMatchId, backfillArticleLogos } from "@/lib/articles"
import { MOCK_FIXTURES } from "@/lib/mockData"

// API 호출/AI 비용을 아끼기 위해, 기사를 만들 대상은 이 리그들의 "종료된 경기"로만 제한
const TARGET_LEAGUE_IDS = [39, 140, 78, 292, 135, 61]
// 리그 우선순위 (낮을수록 먼저)
const LEAGUE_PRIORITY: Record<number, number> = {
  39: 1,   // Premier League
  140: 2,  // La Liga
  78: 3,   // Bundesliga
  292: 4,  // K League
  135: 5,  // Serie A
  61: 6,   // Ligue 1
}
// 1회 실행 시 생성할 기사 최대 개수
const MAX_ARTICLES_PER_RUN = 20
// 최근 며칠치 경기까지 소급 생성할지
const LOOKBACK_DAYS = 7

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
    // 최근 LOOKBACK_DAYS일치 경기 모두 가져오기 (삭제된 기사 소급 재생성 포함)
    const dateList: string[] = []
    for (let i = 0; i < LOOKBACK_DAYS; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      dateList.push(d.toISOString().split("T")[0])
    }

    const results = await Promise.all(dateList.map((d) => apiFetch(`/fixtures?date=${d}`)))
    fixtures = results.flatMap((r) => r ?? [])
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

  const skipped: string[] = []

  for (const match of targets) {
    // 이미 기사가 있으면 GPT를 부르지 않고 넘어간다.
    // 스탯/이벤트 조회(API-Football)도 같이 절약된다
    const existing = await getArticleByMatchId(match.fixture.id)
    if (existing) {
      // 로고 저장 기능 배포 전에 만들어진 기사면 로고만 조용히 채워준다 (GPT 재호출 없음)
      await backfillArticleLogos(match.fixture.id, match.teams.home.logo ?? null, match.teams.away.logo ?? null)
      skipped.push(existing.slug)
      continue
    }

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

    const result = await generateMatchArticle({
      homeTeam: match.teams.home.name,
      awayTeam: match.teams.away.name,
      homeScore: match.goals.home,
      awayScore: match.goals.away,
      leagueName: match.league.name,
      statsSummary,
      eventsSummary,
    })

    if (!result) continue

    const slug = slugify(match.teams.home.name, match.teams.away.name, match.fixture.id)

    await saveArticle({
      slug,
      title: result.title,
      matchId: match.fixture.id,
      leagueName: match.league.name,
      homeTeam: match.teams.home.name,
      awayTeam: match.teams.away.name,
      homeScore: match.goals.home,
      awayScore: match.goals.away,
      homeLogo: match.teams.home.logo ?? null,
      awayLogo: match.teams.away.logo ?? null,
      content: result.content,
      createdAt: new Date().toISOString(),
    })

    created.push(slug)
  }

  // skipped: 이미 기사가 있어서 GPT를 부르지 않고 넘어간 경기
  return NextResponse.json({
    ok: true,
    createdCount: created.length,
    slugs: created,
    skippedCount: skipped.length,
  })
}