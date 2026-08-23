import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

function getSql() { return neon(process.env.DATABASE_URL!) }

// 투표 테이블 초기화
async function ensureTable() {
  const sql = getSql()
  await sql`
    CREATE TABLE IF NOT EXISTS match_votes (
      match_id INTEGER NOT NULL,
      reaction TEXT NOT NULL CHECK (reaction IN ('great', 'boring', 'surprising')),
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (match_id, reaction)
    )
  `
}

// GET: 특정 경기 투표 현황 조회
export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get("matchId")
  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 })

  await ensureTable()
  const sql = getSql()
  const rows = await sql`SELECT reaction, count FROM match_votes WHERE match_id = ${parseInt(matchId)}`

  const votes = { great: 0, boring: 0, surprising: 0 }
  for (const r of rows) {
    votes[r.reaction as keyof typeof votes] = r.count
  }

  return NextResponse.json({ matchId: parseInt(matchId), votes })
}

// POST: 투표
export async function POST(req: NextRequest) {
  const { matchId, reaction } = await req.json()
  if (!matchId || !reaction) return NextResponse.json({ error: "invalid" }, { status: 400 })
  if (!["great", "boring", "surprising"].includes(reaction)) {
    return NextResponse.json({ error: "invalid reaction" }, { status: 400 })
  }

  await ensureTable()
  const sql = getSql()
  await sql`
    INSERT INTO match_votes (match_id, reaction, count)
    VALUES (${matchId}, ${reaction}, 1)
    ON CONFLICT (match_id, reaction) DO UPDATE SET count = match_votes.count + 1
  `

  const rows = await sql`SELECT reaction, count FROM match_votes WHERE match_id = ${matchId}`
  const votes = { great: 0, boring: 0, surprising: 0 }
  for (const r of rows) votes[r.reaction as keyof typeof votes] = r.count

  return NextResponse.json({ matchId, votes })
}
