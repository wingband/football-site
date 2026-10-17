import { NextRequest, NextResponse } from "next/server"
import { DIST_LEAGUES, buildLeagueDist, getDistAges } from "@/lib/leagueDist"
import { getSeasonYear } from "@/lib/season"
import { isAdmin } from "@/lib/admin"

export const maxDuration = 300
export const dynamic = "force-dynamic"

// 리그 내 비교용 분포 갱신 (2026-10-17). 매일 돌지만 실제로는 6일 넘게 지난 리그만 다시 받는다
// (리그당 25~40콜 → 전체 주 1회 약 250콜). 시간이 모자라면 남은 리그는 다음 날 이어서 한다.
// 관리자가 브라우저에서 열어도 동작한다 (?league=39 로 한 리그만 강제 갱신 가능).
const TIME_BUDGET_MS = 240_000
const STALE_DAYS = 6

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const cronOk = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`
  if (!cronOk && !(await isAdmin())) return NextResponse.json({ error: "인증 실패" }, { status: 401 })

  const only = Number(req.nextUrl.searchParams.get("league")) || null
  const force = req.nextUrl.searchParams.get("force") === "1" || only !== null
  const started = Date.now()
  const ages = await getDistAges()
  const done: Record<string, unknown> = {}
  const skipped: string[] = []

  for (const lg of DIST_LEAGUES) {
    if (only && lg.id !== only) continue
    const season = getSeasonYear(lg.country)
    const age = ages.get(`${lg.id}:${season}`)
    if (!force && age !== undefined && age < STALE_DAYS) {
      skipped.push(`${lg.name}(${Math.round(age)}일 전)`)
      continue
    }
    if (Date.now() - started > TIME_BUDGET_MS) {
      skipped.push(`${lg.name}(시간 부족, 다음 실행)`)
      continue
    }
    try {
      done[lg.name] = await buildLeagueDist(lg.id, season)
    } catch (err) {
      done[lg.name] = { error: err instanceof Error ? err.message : String(err) }
    }
  }
  return NextResponse.json({ ok: true, done, skipped, ms: Date.now() - started })
}
