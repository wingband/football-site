// 경기 목록용 "마지막으로 성공한 응답" DB 캐시.
// API-Football이 순간적으로 실패하거나(레이트리밋 등) 빈 응답을 주면 경기 목록이 통째로
// 비어버리는데, 성공할 때마다 날짜별로 저장해두고 실패 시 이 값을 대신 보여줌.
// lib/playerStatCache.ts 와 같은 패턴 (선수 기록 캐시)
import { neon } from "@neondatabase/serverless"

function getSql() {
  return neon(process.env.DATABASE_URL!)
}

let tableReady: Promise<unknown> | null = null

function ensureTable() {
  if (!tableReady) {
    const sql = getSql()
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS fixtures_cache (
        date TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
  }
  return tableReady
}

export type CachedFixtures<T> = {
  data: T[]
  updatedAt: Date | null
}

// 경기 목록 페이지는 요청마다 렌더링되므로, 그대로 두면 조회 한 번에 DB 쓰기 한 번이 된다.
// API fetch 자체가 5분 캐시라 그 사이 값은 어차피 동일해서, 인스턴스별로 1분간 재저장을 건너뜀
const SAVE_THROTTLE_MS = 60_000
const lastSavedAt = new Map<string, number>()

// date는 화면에서 선택된 날짜(YYYY-MM-DD). 저장하는 값은 그 날짜 탭에서 실제로 보여준
// 병합 결과 전체라서, 캐시를 그대로 꺼내 쓰면 성공했을 때와 같은 화면이 나온다
export async function saveCachedFixtures<T>(date: string, data: T[]) {
  // 빈 배열은 저장하지 않는다. 실패 응답(빈 배열)이 캐시를 덮어써서
  // 폴백이 무의미해지는 것을 막기 위함
  if (data.length === 0) return

  const now = Date.now()
  const last = lastSavedAt.get(date)
  if (last !== undefined && now - last < SAVE_THROTTLE_MS) return
  lastSavedAt.set(date, now)

  try {
    await ensureTable()
    const sql = getSql()
    const json = JSON.stringify(data)
    await sql`
      INSERT INTO fixtures_cache (date, data, updated_at)
      VALUES (${date}, ${json}, now())
      ON CONFLICT (date)
      DO UPDATE SET data = ${json}, updated_at = now()
      WHERE fixtures_cache.data IS DISTINCT FROM EXCLUDED.data
    `
  } catch (err) {
    // 캐시 저장 실패는 치명적이지 않으니 로그만 남기고 넘어감 (화면엔 영향 없어야 함)
    console.error("경기 목록 캐시 저장 실패:", err)
  }
}

export async function getCachedFixtures<T>(date: string): Promise<CachedFixtures<T> | null> {
  try {
    await ensureTable()
    const sql = getSql()
    const rows = await sql`SELECT data, updated_at FROM fixtures_cache WHERE date = ${date}`
    if (rows.length === 0) return null
    const data = rows[0].data as T[]
    if (!Array.isArray(data) || data.length === 0) return null
    return { data, updatedAt: rows[0].updated_at ? new Date(rows[0].updated_at) : null }
  } catch (err) {
    console.error("경기 목록 캐시 조회 실패:", err)
    return null
  }
}
