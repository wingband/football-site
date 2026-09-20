// (2026-09-21) AdSense 심사 대비 백필 전용 라우트.
//
// 기존 128건 기사 중 109건이 800자 미만으로 짧게 생성돼 있었다(프롬프트가
// "단어 수"로 분량을 지시해서 GPT가 한국어에서 실제로는 훨씬 짧게 쓴 문제,
// lib/generateArticle.ts에서 글자 수 기준으로 이미 수정함). 기존 기사를
// 삭제 후 재생성하면 이미 색인된 URL이 깨지므로, 같은 slug/match_id에
// 내용만 새 프롬프트로 덮어쓰는 "제자리 재생성" 방식을 쓴다.
//
// 로컬 서버는 API-Football에서 403을 받는 상태라 이 작업은 반드시 Vercel에
// 배포된 이 라우트를 통해 실행해야 한다.
import { NextRequest, NextResponse } from "next/server"
import { fetchApiFootball } from "@/lib/apiFootballClient"
import { buildStatsSummary, buildMatchEventSummaries, type RawMatchEvent, type RawTeamStats } from "@/lib/matchSummaries"
import { generateMatchArticle } from "@/lib/generateArticle"
import { getArticlesUnderLength, getArticleByMatchId, updateArticleContent } from "@/lib/articles"
import { TEAM_NAME_KO } from "@/lib/koreanNames"
import { KOREAN_PLAYERS_ABROAD } from "@/lib/koreanPlayersAbroad"

export const maxDuration = 300

const SLEEP_MS = 500

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getKoreanPlayerSummary(matchId: number): Promise<string | undefined> {
  try {
    const fixturePlayers = (await fetchApiFootball(`/fixtures/players?fixture=${matchId}`)) as
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

    if (!fixturePlayers?.length) return undefined

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
    return summaries.length ? summaries.join("\n") : undefined
  } catch {
    return undefined
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 })
  }

  const sp = req.nextUrl.searchParams
  const limit = Math.min(parseInt(sp.get("limit") ?? "3"), 30) // 안전장치: 한 번에 최대 30건
  const maxLength = parseInt(sp.get("maxLength") ?? "800")
  const dryRun = sp.get("dryRun") === "true"
  const matchIdParam = sp.get("matchId")

  // (2026-09-21) 골 유형(페널티/자책골) 오기처럼, 글자 수와 무관하게 사실관계
  // 자체가 틀린 특정 기사 하나를 콕 집어 재생성해야 하는 경우를 위한 경로.
  // ?matchId=1570394 형태로 호출하면 길이 조건 없이 그 경기 하나만 대상이 된다.
  const targets = matchIdParam
    ? (await getArticleByMatchId(parseInt(matchIdParam))
        .then((a) => (a ? [a] : [])))
    : await getArticlesUnderLength(maxLength, limit)

  const results: {
    slug: string
    matchId: number
    oldLength: number
    newLength: number | null
    hasKoreanPlayer: boolean
    status: "updated" | "dry-run" | "failed"
    error?: string
  }[] = []

  for (const article of targets) {
    try {
      const [statsRaw, eventsRaw] = await Promise.all([
        fetchApiFootball(`/fixtures/statistics?fixture=${article.matchId}`),
        fetchApiFootball(`/fixtures/events?fixture=${article.matchId}`),
      ])

      const statsSummary = buildStatsSummary(statsRaw as RawTeamStats[])
      const { eventsSummary, goalsSummary, playerTags } = buildMatchEventSummaries(
        eventsRaw as RawMatchEvent[],
        article.homeTeam,
        article.awayTeam
      )

      const koreanPlayerSummary = await getKoreanPlayerSummary(article.matchId)

      const homeTeamKo = TEAM_NAME_KO[article.homeTeam] ?? article.homeTeam
      const awayTeamKo = TEAM_NAME_KO[article.awayTeam] ?? article.awayTeam

      const result = await generateMatchArticle({
        homeTeam: homeTeamKo,
        awayTeam: awayTeamKo,
        homeScore: article.homeScore,
        awayScore: article.awayScore,
        leagueName: article.leagueName,
        statsSummary,
        eventsSummary,
        goalsSummary,
        koreanPlayerSummary,
      })

      if (!result) {
        results.push({
          slug: article.slug,
          matchId: article.matchId,
          oldLength: article.content.length,
          newLength: null,
          hasKoreanPlayer: Boolean(koreanPlayerSummary),
          status: "failed",
          error: "generateMatchArticle이 null 반환",
        })
        continue
      }

      if (!dryRun) {
        await updateArticleContent(article.matchId, result.title, result.content, playerTags)
      }

      results.push({
        slug: article.slug,
        matchId: article.matchId,
        oldLength: article.content.length,
        newLength: result.content.length,
        hasKoreanPlayer: Boolean(koreanPlayerSummary),
        status: dryRun ? "dry-run" : "updated",
      })
    } catch (err) {
      results.push({
        slug: article.slug,
        matchId: article.matchId,
        oldLength: article.content.length,
        newLength: null,
        hasKoreanPlayer: false,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      })
    }

    await sleep(SLEEP_MS)
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    maxLength,
    limitRequested: limit,
    processed: results.length,
    updated: results.filter((r) => r.status === "updated").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  })
}
