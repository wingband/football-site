import { NextRequest, NextResponse } from "next/server"
import { generateMatchArticle } from "@/lib/generateArticle"
import { buildStatsSummary, buildMatchEventSummaries, type RawMatchEvent } from "@/lib/matchSummaries"
import { saveArticle, slugify, getArticleByMatchId, backfillArticleLogos } from "@/lib/articles"
import { MOCK_FIXTURES } from "@/lib/mockData"
import { TEAM_NAME_KO } from "@/lib/koreanNames"
import { KOREAN_PLAYERS_ABROAD } from "@/lib/koreanPlayersAbroad"

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
      statsSummary = buildStatsSummary(stats)

      const events = (await apiFetch(`/fixtures/events?fixture=${match.fixture.id}`)) as
        | RawMatchEvent[]
        | undefined

      const summaries = buildMatchEventSummaries(events, match.teams.home.name, match.teams.away.name)
      eventsSummary = summaries.eventsSummary
      goalsSummary = summaries.goalsSummary
      playerTags = summaries.playerTags
    }

    // 이 경기에 우리가 추적하는 한국인 해외파 선수가 뛰었는지 확인.
    // 뛰었으면 그 선수의 실제 매치 스탯(출전시간/평점/골/도움)을 프롬프트에 넘겨서
    // 기사 분량을 늘리고 그 선수 전용 문단을 추가하게 한다.
    // (2026-09-10, 한국 선수 출전 경기는 독자 관심이 커서 더 상세하게 요청받음)
    let koreanPlayerSummary: string | undefined

    if (process.env.USE_MOCK_DATA !== "true") {
      const fixturePlayers = (await apiFetch(`/fixtures/players?fixture=${match.fixture.id}`)) as
        | {
            team: { name: string }
            players: {
              player: { id: number; name: string }
              statistics: {
                games: { minutes: number | null; rating: string | null; position: string | null }
                goals: { total: number | null; assists: number | null }
              }[]
            }[]
          }[]
        | undefined

      if (fixturePlayers?.length) {
        const summaries: string[] = []
        for (const teamBlock of fixturePlayers) {
          for (const p of teamBlock.players ?? []) {
            const known = KOREAN_PLAYERS_ABROAD.find((kp) => kp.id === p.player.id)
            if (!known) continue
            const stat = p.statistics?.[0]
            const teamKo = TEAM_NAME_KO[teamBlock.team.name] ?? teamBlock.team.name
            if (!stat || stat.games.minutes == null) {
              summaries.push(`${known.name} (${teamKo}) — 이 경기 출전 기록 없음(벤치 또는 미출전)`)
            } else {
              summaries.push(
                `${known.name} (${teamKo}) — ${stat.games.position ?? "포지션 미상"}, ` +
                  `${stat.games.minutes}분 출전, 평점 ${stat.games.rating ?? "기록없음"}, ` +
                  `골 ${stat.goals.total ?? 0}개, 도움 ${stat.goals.assists ?? 0}개`
              )
            }
          }
        }
        if (summaries.length) koreanPlayerSummary = summaries.join("\n")
      }
    }

    // AI 프롬프트/제목/본문엔 한국어 팀명을 넘긴다 — "손흥민 토트넘 경기" 같은 한국어
    // 롱테일 검색어를 타겟팅하려는 것. 슬러그/DB 저장값은 API 원본 영문명을 그대로 써서
    // 기존 URL 형식과 admin cleanup(?homeTeam=&awayTeam=) 부분일치 매칭이 안 깨지게 한다
    const homeTeamKo = TEAM_NAME_KO[match.teams.home.name] ?? match.teams.home.name
    const awayTeamKo = TEAM_NAME_KO[match.teams.away.name] ?? match.teams.away.name

    const result = await generateMatchArticle({
      homeTeam: homeTeamKo,
      awayTeam: awayTeamKo,
      homeScore: match.goals.home,
      awayScore: match.goals.away,
      leagueName: match.league.name,
      statsSummary,
      eventsSummary,
      goalsSummary,
      koreanPlayerSummary,
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