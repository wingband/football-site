import { neon } from "@neondatabase/serverless"

export type Post = {
  id: number
  userId: string
  nickname: string
  category: string
  title: string
  content: string
  viewCount: number
  likeCount: number
  commentCount: number
  createdAt: string
}

export type Comment = {
  id: number
  postId: number
  userId: string
  nickname: string
  content: string
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
    `.then(async () => {
      const sqlLikes = getSql()
      await sqlLikes`
        CREATE TABLE IF NOT EXISTS board_likes (
          post_id INTEGER NOT NULL,
          user_id TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (post_id, user_id)
        )
      `
      const sqlComments = getSql()
      await sqlComments`
        CREATE TABLE IF NOT EXISTS board_comments (
          id SERIAL PRIMARY KEY,
          post_id INTEGER NOT NULL,
          user_id TEXT NOT NULL,
          nickname TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `
    })
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
    likeCount: Number(row.like_count ?? 0),
    commentCount: Number(row.comment_count ?? 0),
    createdAt: (row.created_at as Date).toISOString(),
  }
}

function rowToComment(row: Record<string, unknown>): Comment {
  return {
    id: row.id as number,
    postId: row.post_id as number,
    userId: row.user_id as string,
    nickname: row.nickname as string,
    content: row.content as string,
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
  category: string | null = null,
  page = 1,
  pageSize = 20
): Promise<{ posts: Post[]; total: number }> {
  await ensureTable()
  const sql = getSql()
  const offset = (page - 1) * pageSize

  const [rows, countRows] = category
    ? await Promise.all([
        sql`
          SELECT
            p.*,
            (SELECT COUNT(*) FROM board_likes l WHERE l.post_id = p.id) as like_count,
            (SELECT COUNT(*) FROM board_comments c WHERE c.post_id = p.id) as comment_count
          FROM board_posts p
          WHERE category = ${category}
          ORDER BY created_at DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `,
        sql`SELECT COUNT(*) as count FROM board_posts WHERE category = ${category}`,
      ])
    : await Promise.all([
        sql`
          SELECT
            p.*,
            (SELECT COUNT(*) FROM board_likes l WHERE l.post_id = p.id) as like_count,
            (SELECT COUNT(*) FROM board_comments c WHERE c.post_id = p.id) as comment_count
          FROM board_posts p
          ORDER BY created_at DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `,
        sql`SELECT COUNT(*) as count FROM board_posts`,
      ])

  return {
    posts: rows.map(rowToPost),
    total: Number(countRows[0].count),
  }
}

async function selectPostById(id: number): Promise<Post | null> {
  const sql = getSql()
  const rows = await sql`
    SELECT
      p.*,
      (SELECT COUNT(*) FROM board_likes l WHERE l.post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM board_comments c WHERE c.post_id = p.id) as comment_count
    FROM board_posts p
    WHERE p.id = ${id}
    LIMIT 1
  `
  return rows.length > 0 ? rowToPost(rows[0]) : null
}

// 조회수는 매 조회마다 1씩 증가. 서버 컴포넌트가 페이지 렌더링 시
// 1회만 호출하므로 어뷰징 여지가 적음
export async function getPostById(id: number): Promise<Post | null> {
  await ensureTable()
  const sql = getSql()
  await sql`UPDATE board_posts SET view_count = view_count + 1 WHERE id = ${id}`
  return selectPostById(id)
}

// 조회수를 올리면 안 되는 경우(수정 폼 프리필 등)에 사용
export async function getPostRaw(id: number): Promise<Post | null> {
  await ensureTable()
  return selectPostById(id)
}

// 글쓴이 본인만 수정 가능 — userId가 안 맞으면 조용히 0행 갱신되고 false 반환
export async function updatePost(
  id: number,
  userId: string,
  params: { title: string; content: string }
): Promise<boolean> {
  await ensureTable()
  const sql = getSql()
  const rows = await sql`
    UPDATE board_posts
    SET title = ${params.title}, content = ${params.content}
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id
  `
  return rows.length > 0
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

export async function likePost(postId: number, userId: string): Promise<boolean> {
  await ensureTable()
  const sql = getSql()
  const rows = await sql`
    INSERT INTO board_likes (post_id, user_id)
    VALUES (${postId}, ${userId})
    ON CONFLICT (post_id, user_id) DO NOTHING
    RETURNING post_id
  `
  return rows.length > 0
}

export async function hasLiked(postId: number, userId: string): Promise<boolean> {
  await ensureTable()
  const sql = getSql()
  const rows = await sql`
    SELECT 1 FROM board_likes WHERE post_id = ${postId} AND user_id = ${userId} LIMIT 1
  `
  return rows.length > 0
}

export async function getComments(postId: number): Promise<Comment[]> {
  await ensureTable()
  const sql = getSql()
  const rows = await sql`
    SELECT * FROM board_comments WHERE post_id = ${postId} ORDER BY created_at ASC
  `
  return rows.map(rowToComment)
}

export async function createComment(params: {
  postId: number
  userId: string
  nickname: string
  content: string
}): Promise<void> {
  await ensureTable()
  const sql = getSql()
  await sql`
    INSERT INTO board_comments (post_id, user_id, nickname, content)
    VALUES (${params.postId}, ${params.userId}, ${params.nickname}, ${params.content})
  `
}

export async function deleteComment(id: number, userId: string): Promise<boolean> {
  await ensureTable()
  const sql = getSql()
  const rows = await sql`
    DELETE FROM board_comments WHERE id = ${id} AND user_id = ${userId} RETURNING id
  `
  return rows.length > 0
}
