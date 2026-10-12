import { neon } from "@neondatabase/serverless"

// 칼럼 댓글 (2026-10-12). 게시판 댓글과 같은 Neon DB를 쓰되 칼럼 slug 기준으로 따로 저장한다.

export type ColumnComment = {
  id: number
  slug: string
  userId: string
  nickname: string
  content: string
  createdAt: string
}

let tableReady: Promise<unknown> | null = null

function ensureTable() {
  if (!tableReady) {
    const sql = neon(process.env.DATABASE_URL!)
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS column_comments (
        id SERIAL PRIMARY KEY,
        slug TEXT NOT NULL,
        user_id TEXT NOT NULL,
        nickname TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
      .then(() => sql`CREATE INDEX IF NOT EXISTS column_comments_slug_idx ON column_comments (slug, created_at)`)
      .catch((e: unknown) => {
        tableReady = null // 실패한 약속이 계속 남지 않게
        throw e
      })
  }
  return tableReady
}

function row(r: Record<string, unknown>): ColumnComment {
  return {
    id: Number(r.id),
    slug: String(r.slug),
    userId: String(r.user_id),
    nickname: String(r.nickname),
    content: String(r.content),
    createdAt: new Date(r.created_at as string).toISOString(),
  }
}

export async function getColumnComments(slug: string): Promise<ColumnComment[]> {
  await ensureTable()
  const sql = neon(process.env.DATABASE_URL!)
  const rows = await sql`SELECT * FROM column_comments WHERE slug = ${slug} ORDER BY created_at ASC LIMIT 300`
  return rows.map(row)
}

// 같은 사용자가 최근 N초 안에 쓴 댓글이 있는지 (도배 방지)
export async function hasRecentComment(userId: string, seconds: number): Promise<boolean> {
  await ensureTable()
  const sql = neon(process.env.DATABASE_URL!)
  const rows = await sql`
    SELECT 1 FROM column_comments WHERE user_id = ${userId} AND created_at > now() - make_interval(secs => ${seconds}) LIMIT 1
  `
  return rows.length > 0
}

export async function createColumnComment(p: { slug: string; userId: string; nickname: string; content: string }): Promise<ColumnComment> {
  await ensureTable()
  const sql = neon(process.env.DATABASE_URL!)
  const rows = await sql`
    INSERT INTO column_comments (slug, user_id, nickname, content)
    VALUES (${p.slug}, ${p.userId}, ${p.nickname}, ${p.content})
    RETURNING *
  `
  return row(rows[0])
}

// 본인 댓글만(관리자는 전부) 지운다
export async function deleteColumnComment(id: number, userId: string, admin: boolean): Promise<boolean> {
  await ensureTable()
  const sql = neon(process.env.DATABASE_URL!)
  const rows = admin
    ? await sql`DELETE FROM column_comments WHERE id = ${id} RETURNING id`
    : await sql`DELETE FROM column_comments WHERE id = ${id} AND user_id = ${userId} RETURNING id`
  return rows.length > 0
}
