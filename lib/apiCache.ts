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
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS api_cache (
        cache_key TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
  }
  return tableReady
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
