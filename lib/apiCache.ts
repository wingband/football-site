// API-Football 응답을 Neon Postgres에 저장해두는 범용 캐시.
// 방문자가 몇 명이든 API 소진량이 고정되게 만드는 게 목적 — DB에 신선한 값이
// 있으면 API를 아예 안 부르고 반환한다. (2026-09-17, 방문자 수와 API 소진량이
// 그대로 비례하던 구조를 끊기 위해 도입 — player_stat_cache와 같은 neon 클라이언트 재사용)
import { neon } from "@neondatabase/serverless"

function getSql() {
  return neon(process.env.DATABASE_URL!)
}

let tableReady: Promise<unknown> | null = null

function ensureTable() {
  if (!tableReady) {
    const sql = getSql()
    // CREATE TABLE IF NOT EXISTS 자체가 원자적이지 않아서, 여러 서버리스 인스턴스가
    // 동시에 콜드스타트하면 서로 테이블을 만들려다 경합할 수 있다. (2026-09-18,
    // /teams/116에서 NeonDbError: duplicate key value violates unique constraint
    // "pg_type_typname_nsp_index" 확인) — 23505(unique_violation)는 이미 다른
    // 인스턴스가 만들어준 것이니 그냥 무시하고 넘어간다.
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS api_cache (
        cache_key TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `.catch((err: any) => {
      if (err?.code !== "23505") throw err
    })
  }
  return tableReady
}

let usageTableReady: Promise<unknown> | null = null

export function ensureUsageTable() {
  if (!usageTableReady) {
    const sql = getSql()
    usageTableReady = sql`
      CREATE TABLE IF NOT EXISTS api_usage_daily (
        usage_date DATE PRIMARY KEY,
        call_count INTEGER NOT NULL DEFAULT 0
      )
    `.catch((err: any) => {
      if (err?.code !== "23505") throw err
    })
  }
  return usageTableReady
}

// 실제로 API-Football에 라이브 호출이 나간 순간(캐시 미스로 fetcher()가 실행된 순간)마다
// 날짜별 카운터를 1씩 증가시킨다. API-Football 대시보드를 수동으로 열어봐야만 소진량을
// 알 수 있던 문제를 없애고, /api/admin/usage로 우리 DB에서 바로 추이를 확인할 수 있게
// 한다. (2026-09-19) 실패해도 본 캐시 기능에는 영향 주지 않도록 완전히 격리한다.
async function recordApiUsage() {
  try {
    await ensureUsageTable()
    const sql = getSql()
    const today = new Date().toISOString().slice(0, 10)
    await sql`
      INSERT INTO api_usage_daily (usage_date, call_count)
      VALUES (${today}, 1)
      ON CONFLICT (usage_date)
      DO UPDATE SET call_count = api_usage_daily.call_count + 1
    `
  } catch (err) {
    console.error("api_usage_daily 기록 실패:", err instanceof Error ? err.message : err)
  }
}

// cacheKey에 해당하는 값이 DB에 ttlSeconds 이내로 신선하게 있으면 그걸 반환하고
// API는 아예 안 부른다. 없거나 오래됐으면 fetcher()로 실제 API를 불러서 DB에
// 저장한 뒤 반환한다. fetcher가 실패하면(레이트리밋 등) 오래된 DB 값이라도
// 있으면 그거라도 반환해서 화면이 완전히 비는 걸 막는다.
export async function getCachedOrFetch<T>(
  cacheKey: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  await ensureTable()
  const sql = getSql()

  try {
    const fresh = await sql`
      SELECT data FROM api_cache
      WHERE cache_key = ${cacheKey}
        AND updated_at > now() - interval '1 second' * ${ttlSeconds}
    `
    if (fresh.length > 0) {
      return fresh[0].data as T
    }
  } catch (err) {
    console.error("api_cache 조회 실패:", err)
  }

  try {
    const result = await fetcher()
    await recordApiUsage()
    try {
      await sql`
        INSERT INTO api_cache (cache_key, data, updated_at)
        VALUES (${cacheKey}, ${JSON.stringify(result)}, now())
        ON CONFLICT (cache_key)
        DO UPDATE SET data = ${JSON.stringify(result)}, updated_at = now()
      `
    } catch (saveErr) {
      console.error("api_cache 저장 실패:", saveErr)
    }
    return result
  } catch (fetchErr) {
    try {
      const stale = await sql`SELECT data FROM api_cache WHERE cache_key = ${cacheKey}`
      if (stale.length > 0) {
        console.error(`API 호출 실패, 오래된 캐시로 대체 (${cacheKey}):`, fetchErr instanceof Error ? fetchErr.message : fetchErr)
        return stale[0].data as T
      }
    } catch {
      // 캐시 조회까지 실패하면 그냥 원래 에러를 던진다
    }
    throw fetchErr
  }
}
