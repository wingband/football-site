import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

function getSql() { return neon(process.env.DATABASE_URL!) }

async function ensureTable() {
  const sql = getSql()
  await sql`
    CREATE TABLE IF NOT EXISTS match_comments (
      id SERIAL PRIMARY KEY,
      match_id INTEGER NOT NULL,
      nickname TEXT NOT NULL,
      content TEXT NOT NULL,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_comments_match ON match_comments(match_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_comments_created ON match_comments(created_at DESC)`
}

// GET: 경기별 댓글 or 전체 최신 댓글
export async function GET(req: NextRequest) {
  await ensureTable()
  const sql = getSql()
  const matchId = req.nextUrl.searchParams.get("matchId")
  const latest = req.nextUrl.searchParams.get("latest") // 메인화면용

  if (latest) {
    // 전체 최신 댓글 10개 (메인화면 위젯)
    const rows = await sql`
      SELECT id, match_id, nickname, content, home_team, away_team, created_at
      FROM match_comments
      ORDER BY created_at DESC
      LIMIT 10
    `
    return NextResponse.json({ comments: rows })
  }

  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 })

  const rows = await sql`
    SELECT id, match_id, nickname, content, created_at
    FROM match_comments
    WHERE match_id = ${parseInt(matchId)}
    ORDER BY created_at ASC
    LIMIT 100
  `
  return NextResponse.json({ comments: rows })
}

// POST: 댓글 작성
export async function POST(req: NextRequest) {
  const { matchId, nickname, content, homeTeam, awayTeam } = await req.json()

  if (!matchId || !nickname?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 })
  }
  if (content.trim().length > 200) {
    return NextResponse.json({ error: "200자 이내로 작성해주세요" }, { status: 400 })
  }
  if (nickname.trim().length > 20) {
    return NextResponse.json({ error: "닉네임은 20자 이내" }, { status: 400 })
  }

  await ensureTable()
  const sql = getSql()
  const rows = await sql`
    INSERT INTO match_comments (match_id, nickname, content, home_team, away_team)
    VALUES (${matchId}, ${nickname.trim()}, ${content.trim()}, ${homeTeam ?? ""}, ${awayTeam ?? ""})
    RETURNING id, match_id, nickname, content, created_at
  `
  return NextResponse.json({ comment: rows[0] })
}
