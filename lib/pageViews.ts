// 오늘 방문자 수 카운터. 날짜별로 한 행씩 쌓는다.
// lib/fixturesCache.ts / lib/playerStatCache.ts 와 같은 Neon 접근 패턴
import { neon } from "@neondatabase/serverless"
import { getTodayStr } from "@/lib/dateUtils"

function getSql() {
  return neon(process.env.DATABASE_URL!)
}

let tableReady: Promise<unknown> | null = null

function ensureTable() {
  if (!tableReady) {
    const sql = getSql()
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS page_views (
        date TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0
      )
    `
  }
  return tableReady
}

// 오늘 카운트를 1 올리고 올린 뒤의 값을 돌려준다.
// count = page_views.count + 1 을 DB에서 계산하므로 동시 요청에도 값이 유실되지 않는다
export async function incrementTodayViews(): Promise<number | null> {
  try {
    await ensureTable()
    const sql = getSql()
    const rows = await sql`
      INSERT INTO page_views (date, count)
      VALUES (${getTodayStr()}, 1)
      ON CONFLICT (date)
      DO UPDATE SET count = page_views.count + 1
      RETURNING count
    `
    return rows[0]?.count ?? null
  } catch (err) {
    // 카운터는 부가 기능이라 실패해도 화면에 영향이 없어야 한다
    console.error("방문자 수 증가 실패:", err)
    return null
  }
}

export async function getTodayViews(): Promise<number | null> {
  try {
    await ensureTable()
    const sql = getSql()
    const rows = await sql`SELECT count FROM page_views WHERE date = ${getTodayStr()}`
    return rows[0]?.count ?? 0
  } catch (err) {
    console.error("방문자 수 조회 실패:", err)
    return null
  }
}
