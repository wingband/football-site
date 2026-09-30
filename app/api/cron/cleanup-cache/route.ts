import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

function getSql() {
  return neon(process.env.DATABASE_URL!)
}

// api_cache는 TTL 기반 범용 캐시라 오래된 행을 지워도 다음 요청 때 다시 채워진다
// (match_detail_cache와 달리 "영구 보관"이 의도가 아님). 삭제 로직이 아예 없어서
// 무한정 쌓이다가 2026-09-23 Neon 프로젝트 용량 한도(512MB)를 넘겨 DB 쓰기가
// 전부 조용히 실패하는 사고로 이어졌다 — 재발 방지용으로 매일 정리한다.
// 한 번에 대량 삭제하면 타임아웃날 수 있어 배치로 나눠 지운다.
const BATCH_SIZE = 10000
const MAX_BATCHES = 30 // 최대 30만 건/실행 — 그 이상 밀려있으면 다음 날 실행에서 이어서 처리
const RETENTION_DAYS = 2

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 })
  }

  const sql = getSql()
  let totalDeleted = 0

  try {
    for (let i = 0; i < MAX_BATCHES; i++) {
      const result = await sql`
        DELETE FROM api_cache
        WHERE cache_key IN (
          SELECT cache_key FROM api_cache
          WHERE updated_at < now() - interval '1 day' * ${RETENTION_DAYS}
          LIMIT ${BATCH_SIZE}
        )
        RETURNING cache_key
      `
      totalDeleted += result.length
      if (result.length < BATCH_SIZE) break
    }

    // VACUUM은 트랜잭션 안에서 실행 불가 — neon() 드라이버는 각 쿼리를 독립 실행하므로 문제없음
    await sql`VACUUM ANALYZE api_cache`

    return NextResponse.json({ ok: true, deleted: totalDeleted })
  } catch (err) {
    console.error("api_cache 정리 실패:", err instanceof Error ? err.message : err)
    return NextResponse.json(
      { ok: false, deleted: totalDeleted, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
