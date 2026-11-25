// 오늘 방문자 수 카운터. 날짜별로 한 행씩 쌓는다.
// lib/fixturesCache.ts / lib/playerStatCache.ts 와 같은 Neon 접근 패턴
import { neon } from "@neondatabase/serverless"
import { getTodayStr, toDateStr } from "@/lib/dateUtils"

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
  return tableReady.catch((e: unknown) => { tableReady = null; throw e })
}

let utmTableReady: Promise<unknown> | null = null

function ensureUtmTable() {
  if (!utmTableReady) {
    const sql = getSql()
    utmTableReady = sql`
      CREATE TABLE IF NOT EXISTS utm_visits (
        source TEXT NOT NULL,
        date TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (source, date)
      )
    `
  }
  return utmTableReady.catch((e: unknown) => { utmTableReady = null; throw e })
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

// 커뮤니티 홍보 링크(?utm_source=fmkorea 등)로 들어온 방문을
// 소스별 · 날짜별로 쌓는다. 어느 채널이 실제로 눌러보고 들어오는지 확인하기 위함
// (2026-09-08, 6개 커뮤니티 홍보글 게시 전 추적 인프라 마련)
export async function incrementUtmSource(source: string): Promise<void> {
  try {
    await ensureUtmTable()
    const sql = getSql()
    await sql`
      INSERT INTO utm_visits (source, date, count)
      VALUES (${source}, ${getTodayStr()}, 1)
      ON CONFLICT (source, date)
      DO UPDATE SET count = utm_visits.count + 1
    `
  } catch (err) {
    // 카운터는 부가 기능이라 실패해도 화면에 영향이 없어야 한다
    console.error("UTM 방문 기록 실패:", err)
  }
}

export async function getUtmStats(days = 14): Promise<{ source: string; total: number; lastSeen: string }[]> {
  try {
    await ensureUtmTable()
    const sql = getSql()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = toDateStr(cutoff)

    const rows = await sql`
      SELECT source, SUM(count)::int AS total, MAX(date) AS last_seen
      FROM utm_visits
      WHERE date >= ${cutoffStr}
      GROUP BY source
      ORDER BY total DESC
    `
    return rows.map((r) => ({ source: r.source, total: r.total, lastSeen: r.last_seen }))
  } catch (err) {
    console.error("UTM 통계 조회 실패:", err)
    return []
  }
}

// (2026-11-25) 방문 기록 로그. 하단 카운터(130명)와 구글 애널리틱스(하루 2~4명)가 크게 어긋나서,
// "누가 들어왔는지"를 브라우저 종류(User-Agent)·국가·분류별로 묶어 날짜마다 쌓는다.
// IP 같은 개인정보는 저장하지 않는다. 확인: /api/admin/visit-log?days=3
// kind: human(사람으로 보고 카운트함) / load(페이지만 열고 아무 조작 없음) / crawler(알려진 크롤러) / automation(자동화 브라우저)
export type VisitKind = "human" | "load" | "crawler" | "automation"

let visitLogReady: Promise<unknown> | null = null

function ensureVisitLogTable() {
  if (!visitLogReady) {
    const sql = getSql()
    visitLogReady = sql`
      CREATE TABLE IF NOT EXISTS visit_log (
        date TEXT NOT NULL,
        kind TEXT NOT NULL,
        ua TEXT NOT NULL,
        country TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (date, kind, ua, country)
      )
    `
  }
  return visitLogReady.catch((e: unknown) => { visitLogReady = null; throw e })
}

export async function logVisit(kind: VisitKind, userAgent: string | null, country: string | null): Promise<void> {
  try {
    await ensureVisitLogTable()
    const sql = getSql()
    const ua = (userAgent || "(없음)").slice(0, 200)
    const c = (country || "??").slice(0, 8)
    await sql`
      INSERT INTO visit_log (date, kind, ua, country, count)
      VALUES (${getTodayStr()}, ${kind}, ${ua}, ${c}, 1)
      ON CONFLICT (date, kind, ua, country)
      DO UPDATE SET count = visit_log.count + 1
    `
  } catch (err) {
    console.error("방문 로그 기록 실패:", err)
  }
}

export async function getVisitLog(days = 3) {
  try {
    await ensureVisitLogTable()
    const sql = getSql()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = toDateStr(cutoff)
    const totals = await sql`
      SELECT date, kind, SUM(count)::int AS total
      FROM visit_log WHERE date >= ${cutoffStr}
      GROUP BY date, kind ORDER BY date DESC, total DESC
    `
    const top = await sql`
      SELECT date, kind, country, ua, count
      FROM visit_log WHERE date >= ${cutoffStr}
      ORDER BY date DESC, count DESC LIMIT 200
    `
    return { totals, top }
  } catch (err) {
    console.error("방문 로그 조회 실패:", err)
    return { totals: [], top: [] }
  }
}
