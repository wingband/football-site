import { neon } from "@neondatabase/serverless"

export type Post = {
  id: number
  userId: string
  nickname: string
  category: string
  title: string
  content: string
  viewCount: number
  createdAt: string
}

function getSql() {
  return neon(process.env.DATABASE_URL!)
}

let tableReady: Promise<unknown> | null = null

function ensureTable() {
  if (!tableReady) {
    const sql = getSql()
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS board_posts (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        nickname TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'free',
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        view_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
  }
  return tableReady
}

function rowToPost(row: Record<string, unknown>): Post {
  return {
    id: row.id as number,
    userId: row.user_id as string,
    nickname: row.nickname as string,
    category: row.category as string,
    title: row.title as string,
    content: row.content as string,
    viewCount: row.view_count as number,
    createdAt: (row.created_at as Date).toISOString(),
  }
}

export async function createPost(params: {
  userId: string
  nickname: string
  title: string
  content: string
  category?: string
}): Promise<number> {
  await ensureTable()
  const sql = getSql()
  const rows = await sql`
    INSERT INTO board_posts (user_id, nickname, title, content, category)
    VALUES (${params.userId}, ${params.nickname}, ${params.title}, ${params.content}, ${params.category ?? "free"})
    RETURNING id
  `
  return rows[0].id as number
}

export async function getPosts(
  category = "free",
  page = 1,
  pageSize = 20
): Promise<{ posts: Post[]; total: number }> {
  await ensureTable()
  const sql = getSql()
  const offset = (page - 1) * pageSize

  const [rows, countRows] = await Promise.all([
    sql`
      SELECT * FROM board_posts
      WHERE category = ${category}
      ORDER BY created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `,
    sql`SELECT COUNT(*) as count FROM board_posts WHERE category = ${category}`,
  ])

  return {
    posts: rows.map(rowToPost),
    total: Number(countRows[0].count),
  }
}

// 조회수는 매 조회마다 1씩 증가. 클라이언트에서 매번 부르는 게 아니라
// 서버 컴포넌트가 페이지 렌더링 시 1회만 호출하므로 어뷰징 여지가 적음
export async function getPostById(id: number): Promise<Post | null> {
  await ensureTable()
  const sql = getSql()
  await sql`UPDATE board_posts SET view_count = view_count + 1 WHERE id = ${id}`
  const rows = await sql`SELECT * FROM board_posts WHERE id = ${id} LIMIT 1`
  return rows.length > 0 ? rowToPost(rows[0]) : null
}

// 글쓴이 본인만 삭제 가능 — userId가 안 맞으면 조용히 0행 삭제되고 false 반환
export async function deletePost(id: number, userId: string): Promise<boolean> {
  await ensureTable()
  const sql = getSql()
  const rows = await sql`
    DELETE FROM board_posts WHERE id = ${id} AND user_id = ${userId} RETURNING id
  `
  return rows.length > 0
}
