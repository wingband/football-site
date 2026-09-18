import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

// 최근 14일간 실제 API-Football 라이브 호출량을 우리 DB에서 바로 조회.
// /api/admin(.*)는 middleware.ts의 isPublicRoute에 이미 등록돼 있어 인증 없이
// 열려 있다 — 여기 노출되는 건 날짜별 집계 호출 수뿐이라(민감정보 없음) 기존
// 관례를 그대로 따른다. (2026-09-19)
//
// lib/apiCache.ts의 공유 헬퍼에 의존했더니 원인 불명으로 "relation does not exist"가
// 계속 나서, 같은 sql 커넥션으로 CREATE TABLE과 SELECT를 이 파일 안에서 순서대로
// 직접 실행하는 걸로 단순화했다.
export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    await sql`
      CREATE TABLE IF NOT EXISTS api_usage_daily (
        usage_date DATE PRIMARY KEY,
        call_count INTEGER NOT NULL DEFAULT 0
      )
    `

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
