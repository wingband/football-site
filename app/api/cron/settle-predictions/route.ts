import { NextRequest, NextResponse } from "next/server"
import { fetchApiFootball } from "@/lib/apiFootballClient"
import { getCachedOrFetch } from "@/lib/apiCache"
import { getUnsettledMatchIds, settleMatchPredictions } from "@/lib/predictions"

export const maxDuration = 60

const FINISHED_CODES = ["FT", "AET", "PEN"]

type FixtureStatus = {
  fixture: { status: { short: string } }
  goals: { home: number | null; away: number | null }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 })
  }

  const matchIds = await getUnsettledMatchIds(50)

  const results: {
    matchId: number
    status: "settled" | "not-finished" | "failed"
    error?: string
  }[] = []

  for (const matchId of matchIds) {
    try {
      // (2026-09-21) 자체 revalidate 캐시 대신, 사이트 전체가 공유하는
      // Postgres 기반 캐시(getCachedOrFetch)를 재사용한다. 예측이 걸린 경기는
      // 십중팔구 누군가 경기 상세 페이지를 이미 봤을 것이므로, 그때 저장된
      // 같은 캐시 키(/fixtures?id=X)를 그대로 히트시키면 API 호출이 아예
      // 0번이 되는 경우가 많다. 캐시가 없을 때만 실제로 API를 부른다(10분 TTL).
      const path = `/fixtures?id=${matchId}`
      const response = await getCachedOrFetch<unknown[]>(path, 600, async () => {
        return (await fetchApiFootball(path)) as unknown[]
      })
      const fixture = (response[0] as FixtureStatus | undefined) ?? null

      if (!fixture) {
        results.push({ matchId, status: "failed", error: "fixture not found" })
        continue
      }

      if (!FINISHED_CODES.includes(fixture.fixture.status.short)) {
        results.push({ matchId, status: "not-finished" })
        continue
      }

      if (fixture.goals.home === null || fixture.goals.away === null) {
        results.push({ matchId, status: "failed", error: "goals missing on finished match" })
        continue
      }

      await settleMatchPredictions(matchId, fixture.goals.home, fixture.goals.away)
      results.push({ matchId, status: "settled" })
    } catch (err) {
      results.push({
        matchId,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    settled: results.filter((r) => r.status === "settled").length,
    notFinished: results.filter((r) => r.status === "not-finished").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  })
}
