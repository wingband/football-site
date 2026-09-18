import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { ensureUsageTable } from "@/lib/apiCache"

// 최근 14일간 실제 API-Football 라이브 호출량을 우리 DB에서 바로 조회.
// /api/admin(.*)는 middleware.ts의 isPublicRoute에 이미 등록돼 있어 인증 없이
// 열려 있다 — 여기 노출되는 건 날짜별 집계 호출 수뿐이라(민감정보 없음) 기존
// 관례를 그대로 따른다. (2026-09-19)
export async function GET() {
  try {
    // 아직 라이브 API 호출이 한 번도 없어서 api_usage_daily 테이블 자체가
    // 안 만들어졌을 수 있다 (테이블은 recordApiUsage()가 처음 호출될 때 생성됨).
    // 조회 시점에도 보장해서, 데이터가 0건이어도 500이 아니라 빈 배열로 정상 응답한다
    await ensureUsageTable()
    const sql = neon(process.env.DATABASE_URL!)
    const rows = await sql`
      SELECT usage_date, call_count
      FROM api_usage_daily
      ORDER BY usage_date DESC
      LIMIT 14
    `
    return NextResponse.json({ ok: true, dailyUsage: rows })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
