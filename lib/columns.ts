import { neon } from "@neondatabase/serverless"

// 칼럼: 운영자가 직접 쓰는 글. AI 자동 생성 리뷰(articles)와 달리 사이트만의
// 고유 콘텐츠라서 검색 색인/애드센스 심사에서 핵심이 되는 섹션이다. (2026-10-10 신설)

export type Column = {
  slug: string
  title: string
  summary: string
  content: string
  tags: string[]
  published: boolean
  createdAt: string
  updatedAt: string
}

export const COLUMN_TITLE_MAX = 120
export const COLUMN_SUMMARY_MAX = 200
export const COLUMN_CONTENT_MAX = 30000

function getSql() {
  return neon(process.env.DATABASE_URL!)
}

let tableReady: Promise<unknown> | null = null

function ensureTable() {
  if (!tableReady) {
    const sql = getSql()
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS columns (
        slug TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL,
        tags TEXT[] NOT NULL DEFAULT '{}',
        published BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `.catch((err) => {
      // 실패한 프라미스를 캐시해두면 이후 요청도 전부 실패하므로 초기화
      tableReady = null
      throw err
    })
  }
  return tableReady.catch((e: unknown) => { tableReady = null; throw e })
}

function rowToColumn(row: Record<string, unknown>): Column {
  return {
    slug: row.slug as string,
    title: row.title as string,
    summary: (row.summary as string) ?? "",
    content: row.content as string,
    tags: (row.tags as string[] | null) ?? [],
    published: Boolean(row.published),
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  }
}

// 목록용. includeDrafts는 관리자 화면에서만 true
//
// (2026-10-12) Neon 월 전송량 한도를 다 써서 DB가 막혔다. 칼럼은 본문까지 통째로 읽는데 메인·목록·검색·사이트맵이
// 방문 때마다 전부 읽어 전송량이 컸다. 같은 서버 인스턴스에서는 90초간 메모리 값을 재사용하고,
// 칼럼을 저장·삭제하면 그 인스턴스 캐시는 바로 비운다. (DB 읽기가 실패하면 오래된 메모리 값으로 버틴다)
const COLUMNS_MEM_MS = 90_000
const columnsMem = new Map<string, { at: number; rows: Column[] }>()

export async function getColumns(opts: { includeDrafts?: boolean; limit?: number } = {}): Promise<Column[]> {
  if (!process.env.DATABASE_URL) return []
  const limit = opts.limit ?? 200
  const memKey = `${opts.includeDrafts ? "d" : "p"}:${limit}`
  const hit = columnsMem.get(memKey)
  if (hit && Date.now() - hit.at < COLUMNS_MEM_MS) return hit.rows
  try {
    await ensureTable()
    const sql = getSql()
    const rows = opts.includeDrafts
      ? await sql`SELECT * FROM columns ORDER BY created_at DESC LIMIT ${limit}`
      : await sql`SELECT * FROM columns WHERE published = true ORDER BY created_at DESC LIMIT ${limit}`
    const out = rows.map(rowToColumn)
    columnsMem.set(memKey, { at: Date.now(), rows: out })
    return out
  } catch (err) {
    if (hit) return hit.rows
    throw err
  }
}

// 관리자 헤더 배지용: 한 줄 총평을 기다리는 비공개 AI 초안 수
export async function countPendingDrafts(placeholder: string): Promise<number> {
  if (!process.env.DATABASE_URL) return 0
  await ensureTable()
  const sql = getSql()
  const rows = await sql`SELECT COUNT(*)::int AS n FROM columns WHERE published = false AND position(${placeholder} in content) > 0`
  return Number(rows[0]?.n ?? 0)
}

export async function getColumnBySlug(slug: string): Promise<Column | null> {
  if (!process.env.DATABASE_URL) return null
  await ensureTable()
  const sql = getSql()
  const rows = await sql`SELECT * FROM columns WHERE slug = ${slug} LIMIT 1`
  return rows[0] ? rowToColumn(rows[0]) : null
}

export async function saveColumn(input: {
  slug: string
  title: string
  summary: string
  content: string
  tags: string[]
  published: boolean
}): Promise<void> {
  await ensureTable()
  const sql = getSql()
  columnsMem.clear()
  await sql`
    INSERT INTO columns (slug, title, summary, content, tags, published)
    VALUES (${input.slug}, ${input.title}, ${input.summary}, ${input.content}, ${input.tags}, ${input.published})
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      content = EXCLUDED.content,
      tags = EXCLUDED.tags,
      published = EXCLUDED.published,
      updated_at = now()
  `
}

export async function deleteColumn(slug: string): Promise<void> {
  await ensureTable()
  const sql = getSql()
  columnsMem.clear()
  await sql`DELETE FROM columns WHERE slug = ${slug}`
}

// URL slug. 한글 제목은 그대로 쓰면 URL이 길게 인코딩되므로, 영문/숫자만 남기고
// 날짜+랜덤 접미사를 붙여 항상 고유하게 만든다. (예: 2026-10-10-son-heung-min-a1b2)
export function makeColumnSlug(title: string): string {
  const date = new Date().toISOString().slice(0, 10)
  const ascii = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40)
  const rand = Math.random().toString(36).slice(2, 6)
  return [date, ascii, rand].filter(Boolean).join("-")
}

export function isValidColumnSlug(slug: string): boolean {
  return /^[a-z0-9-]{4,100}$/.test(slug)
}

// 본문 길이 기반 대략적인 읽는 시간 (한국어 분당 약 500자 기준)
export function readingMinutes(content: string): number {
  return Math.max(1, Math.round(content.length / 500))
}
