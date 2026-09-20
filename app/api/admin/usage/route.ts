import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

// API-Football Ultra 플랜 실제 한도 (2026-09-19 Pro→Ultra 업그레이드 반영,
// 2026-09-21 이 상수가 업그레이드 이후에도 7,500(Pro 한도)에 그대로 남아있어서
// 실제 사용률을 10배 부풀려 보여주고 있던 것 발견 — 예: 실사용 4%인데 40%로 표시).
// 하루 75,000회. 이 상수는 플랜을 바꾸면 같이 바꿔줘야 한다.
const DAILY_LIMIT = 75000

// 최근 14일간 실제 API-Football 라이브 호출량을 우리 DB에서 바로 조회.
// 날짜별로 한 줄씩 쌓이는 구조라 이 자체가 히스토리 — 오늘 하루만 있으면 1줄,
// 내일부터는 자동으로 2줄, 3줄... 늘어난다.
// /api/admin(.*)는 middleware.ts의 isPublicRoute에 이미 등록돼 있어 인증 없이
// 열려 있다 — 여기 노출되는 건 날짜별 집계 호출 수뿐이라(민감정보 없음) 기존
// 관례를 그대로 따른다. (2026-09-19)
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

    const history = rows.map((r: any) => {
      const count = r.call_count as number
      const percent = Math.round((count / DAILY_LIMIT) * 1000) / 10
      return {
        date: new Date(r.usage_date).toISOString().slice(0, 10),
        calls: count,
        dailyLimit: DAILY_LIMIT,
        percentUsed: percent,
        status: percent >= 80 ? "위험" : percent >= 50 ? "주의" : "안전",
      }
    })

    return NextResponse.json(
      { ok: true, dailyLimit: DAILY_LIMIT, history },
      // (2026-09-21) charset 미지정으로 일부 클라이언트/도구가 응답의 한글 status
      // 값("위험"/"주의"/"안전")을 잘못된 인코딩으로 표시하는 문제가 있었다
      { headers: { "Content-Type": "application/json; charset=utf-8" } }
    )
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
