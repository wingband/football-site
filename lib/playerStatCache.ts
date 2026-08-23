// 한국인 해외파 트래커용 "마지막으로 성공한 선수 기록" DB 캐시.
// API-Football이 순간적으로 실패해도(레이트리밋 등) 화면에서 선수가 사라지지 않도록,
// 성공할 때마다 최신 값을 저장해두고 실패 시 이 값을 대신 보여줌
import { neon } from "@neondatabase/serverless"

export type CachedPlayerStat = {
  player: { id: number; name: string; photo: string }
  statistics: {
    team: { name: string; logo: string }
    league: { name: string }
    games: { appearences: number | null; rating: string | null }
    goals: { total: number | null; assists: number | null }
  }[]
}

function getSql() {
  return neon(process.env.DATABASE_URL!)
}

let tableReady: Promise<unknown> | null = null

function ensureTable() {
  if (!tableReady) {
    const sql = getSql()
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS player_stat_cache (
        player_id INTEGER PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
  }
  return tableReady
}

export async function saveCachedPlayerStat(playerId: number, data: CachedPlayerStat) {
  try {
    await ensureTable()
    const sql = getSql()
    await sql`
      INSERT INTO player_stat_cache (player_id, data, updated_at)
      VALUES (${playerId}, ${JSON.stringify(data)}, now())
      ON CONFLICT (player_id)
      DO UPDATE SET data = ${JSON.stringify(data)}, updated_at = now()
    `
  } catch (err) {
    // 캐시 저장 실패는 치명적이지 않으니 로그만 남기고 넘어감 (화면엔 영향 없어야 함)
    console.error("선수 기록 캐시 저장 실패:", err)
  }
}

export async function getCachedPlayerStat(playerId: number): Promise<CachedPlayerStat | null> {
  try {
    await ensureTable()
    const sql = getSql()
    const rows = await sql`SELECT data FROM player_stat_cache WHERE player_id = ${playerId}`
    if (rows.length === 0) return null
    return rows[0].data as CachedPlayerStat
  } catch (err) {
    console.error("선수 기록 캐시 조회 실패:", err)
    return null
  }
}
