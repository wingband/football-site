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
    let goalsSummary = "골 데이터 없음"
    let playerTags: string[] = []

    if (process.env.USE_MOCK_DATA !== "true") {
      const stats = await apiFetch(`/fixtures/statistics?fixture=${match.fixture.id}`)
      if (stats?.length === 2) {
        statsSummary = stats[0].statistics
          .map((s: { type: string; value: unknown }, i: number) =>
            `${s.type}: ${s.value ?? 0} vs ${stats[1].statistics[i]?.value ?? 0}`
          )
          .join(", ")
      }

      const events = await apiFetch(`/fixtures/events?fixture=${match.fixture.id}`) as
        | {
            time: { elapsed: number }
            type: string
            team: { name: string }
            player: { name: string }
            assist: { name: string | null }
          }[]
        | undefined

      if (events?.length) {
        // GPT가 "49분"을 스스로 전/후반으로 환산하다가 자꾸 틀려서(예: 후반 30분으로 착각),
        // 여기서 미리 "후반 4분"처럼 계산해서 넘겨준다
        const formatHalfMinute = (elapsed: number) =>
          elapsed <= 45 ? `전반 ${elapsed}분` : `후반 ${elapsed - 45}분`

        // 어느 팀 소속인지를 안 알려주면 GPT가 홈/원정을 헷갈려서 골을 반대 팀에 붙이는
        // 경우가 있었다. 팀명과 그 시점의 스코어까지 미리 계산해서 넘겨준다
        let homeGoals = 0
        let awayGoals = 0
        const goalLines: string[] = []
        eventsSummary = events
          .map((e) => {
            let scoreLabel = ""
            if (e.type === "Goal") {
              if (e.team.name === match.teams.home.name) homeGoals++
              else if (e.team.name === match.teams.away.name) awayGoals++
              scoreLabel = ` (스코어 ${homeGoals}-${awayGoals})`
              goalLines.push(
                `${goalLines.length + 1}번째 골 — ${formatHalfMinute(e.time.elapsed)} [${e.team.name}] ${e.player.name}` +
                  (e.assist?.name ? ` (도움: ${e.assist.name})` : "") +
                  ` → 스코어 ${homeGoals}-${awayGoals}`
              )
            }
            return `${formatHalfMinute(e.time.elapsed)}(전체 ${e.time.elapsed}분) [${e.team.name}] ${e.type} - ${e.player.name}${scoreLabel}`
          })
          .join(", ")

        // 골만 따로, 시간순으로 번호를 매겨 명확하게 분리해서 넘긴다.
        // 카드/교체 이벤트들 사이에 골이 묻히면 GPT가 득점 순서·소속팀·스코어를
        // 잘못 재구성하는 경우가 많아서, 가장 중요한 사실만 별도 블록으로 뺀다
        goalsSummary = goalLines.length ? goalLines.join("\n") : "이 경기에는 골이 없었다"

        // 태그용: 득점/어시스트 선수를 먼저, 그다음 카드 받은 선수를 등장 순서대로
        // 중복 없이 모은다 (태그 개수를 늘리기 위해 카드도 포함)
        const seen = new Set<string>()
        const cardTags: string[] = []
        for (const e of events) {
          if (e.type === "Goal") {
            if (e.player.name && !seen.has(e.player.name)) {
              seen.add(e.player.name)
              playerTags.push(e.player.name)
            }
            if (e.assist?.name && !seen.has(e.assist.name)) {
              seen.add(e.assist.name)
              playerTags.push(e.assist.name)
            }
          } else if (e.type === "Card") {
            if (e.player.name && !seen.has(e.player.name)) {
              seen.add(e.player.name)
              cardTags.push(e.player.name)
            }
          }
        }
        playerTags = [...playerTags, ...cardTags].slice(0, 12)
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
      goalsSummary,
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
      playerTags,
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