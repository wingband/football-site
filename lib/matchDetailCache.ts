// 종료된 경기 상세 정보 영구 캐시.
// Next.js의 fetch 캐시(next: { revalidate })는 배포/콜드스타트마다 초기화되는데,
// 종료된 경기는 스코어/이벤트가 다시는 안 바뀌므로 Neon DB에 한 번 저장해두면
// 배포가 몇 번을 거쳐도 API를 다시 부를 필요가 없다. (fixtures_cache와 달리
// "실패 시 폴백"이 아니라 "있으면 항상 먼저 쓰는" 캐시)
import { neon } from "@neondatabase/serverless"

function getSql() {
  return neon(process.env.DATABASE_URL!)
}

let tableReady: Promise<unknown> | null = null

function ensureTable() {
  if (!tableReady) {
    const sql = getSql()
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS match_detail_cache (
        fixture_id BIGINT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
  }
  return tableReady
}

// 종료된 경기만 저장한다 — 진행 중/예정 경기를 저장하면 스코어가 바뀌었을 때
// 영구히 옛날 정보로 굳어버리기 때문
export async function saveCachedMatchDetail(fixtureId: number, data: unknown) {
  try {
    await ensureTable()
    const sql = getSql()
    const json = JSON.stringify(data)
    await sql`
      INSERT INTO match_detail_cache (fixture_id, data, updated_at)
      VALUES (${fixtureId}, ${json}, now())
      ON CONFLICT (fixture_id) DO UPDATE SET data = ${json}, updated_at = now()
    `
  } catch (err) {
    console.error("경기 상세 캐시 저장 실패:", err)
  }
}

export async function getCachedMatchDetail<T>(fixtureId: number): Promise<T | null> {
  try {
    await ensureTable()
    const sql = getSql()
    const rows = await sql`SELECT data FROM match_detail_cache WHERE fixture_id = ${fixtureId}`
    if (rows.length === 0) return null
    return rows[0].data as T
  } catch (err) {
    console.error("경기 상세 캐시 조회 실패:", err)
    return null
  }
}
