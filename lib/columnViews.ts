import { neon } from "@neondatabase/serverless"
import { getTodayStr } from "@/lib/dateUtils"

// 칼럼별 조회수 (2026-10-11). 칼럼·날짜별로 한 행씩 쌓아서 총합과 오늘 수를 함께 본다.
// - 크롤러, 관리자 본인, 같은 브라우저의 같은 날 재방문은 세지 않는다 (app/api/columns/view)
// - 부가 기능이라 실패해도 화면에는 영향 없음

function getSql() {
  return neon(process.env.DATABASE_URL!)
}

let tableReady: Promise<unknown> | null = null
function ensureTable() {
  if (!tableReady) {
    tableReady = getSql()`
      CREATE TABLE IF NOT EXISTS column_view_days (
        slug TEXT NOT NULL,
        date TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (slug, date)
      )
    `.catch((err) => {
      tableReady = null
      throw err
    })
  }
  return tableReady.catch((e: unknown) => { tableReady = null; throw e })
}

export async function incrementColumnView(slug: string): Promise<void> {
  try {
    await ensureTable()
    await getSql()`
      INSERT INTO column_view_days (slug, date, count) VALUES (${slug}, ${getTodayStr()}, 1)
      ON CONFLICT (slug, date) DO UPDATE SET count = column_view_days.count + 1
    `
  } catch (err) {
    console.error("칼럼 조회수 기록 실패:", err)
  }
}

export type ColumnViewStat = { total: number; today: number }

export async function getColumnViews(): Promise<Map<string, ColumnViewStat>> {
  const out = new Map<string, ColumnViewStat>()
  if (!process.env.DATABASE_URL) return out
  try {
    await ensureTable()
    const rows = (await getSql()`
      SELECT slug, SUM(count)::int AS total, COALESCE(SUM(count) FILTER (WHERE date = ${getTodayStr()}), 0)::int AS today
      FROM column_view_days GROUP BY slug
    `) as { slug: string; total: number; today: number }[]
    for (const r of rows) out.set(r.slug, { total: r.total, today: r.today })
  } catch (err) {
    console.error("칼럼 조회수 조회 실패:", err)
  }
  return out
}
