import { neon } from "@neondatabase/serverless"

export type Prediction = {
  id: number
  userId: string
  matchId: number
  homeTeam: string
  awayTeam: string
  predictedHomeScore: number
  predictedAwayScore: number
  actualHomeScore: number | null
  actualAwayScore: number | null
  points: number | null
  settled: boolean
  createdAt: string
}

export type LeaderboardRow = {
  userId: string
  totalPoints: number
  totalPredictions: number
  exactCount: number  // 정확히 맞힌 횟수 (3점)
}

function getSql() {
  return neon(process.env.DATABASE_URL!)
}

let tableReady: Promise<unknown> | null = null

function ensureTable() {
  if (!tableReady) {
    const sql = getSql()
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS predictions (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        match_id INTEGER NOT NULL,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        predicted_home_score INTEGER NOT NULL,
        predicted_away_score INTEGER NOT NULL,
        actual_home_score INTEGER,
        actual_away_score INTEGER,
        points INTEGER,
        settled BOOLEAN NOT NULL DEFAULT false,
        kickoff_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(user_id, match_id)
      )
    `
  }
  return tableReady
}

function rowToPrediction(row: Record<string, unknown>): Prediction {
  return {
    id: row.id as number,
    userId: row.user_id as string,
    matchId: row.match_id as number,
    homeTeam: row.home_team as string,
    awayTeam: row.away_team as string,
    predictedHomeScore: row.predicted_home_score as number,
    predictedAwayScore: row.predicted_away_score as number,
    actualHomeScore: row.actual_home_score as number | null,
    actualAwayScore: row.actual_away_score as number | null,
    points: row.points as number | null,
    settled: row.settled as boolean,
    createdAt: (row.created_at as Date).toISOString(),
  }
}

// 특정 유저가 특정 경기에 이미 예측했는지 확인 (버튼 상태 분기용)
export async function getPrediction(userId: string, matchId: number): Promise<Prediction | null> {
  await ensureTable()
  const sql = getSql()
  const rows = await sql`
    SELECT * FROM predictions WHERE user_id = ${userId} AND match_id = ${matchId} LIMIT 1
  `
  return rows.length > 0 ? rowToPrediction(rows[0]) : null
}

// 예측 생성. 이미 예측했으면 조용히 무시 (경기 시작 전 수정은 지원 안 함 —
// 단순함 유지를 위해 "한 번 예측하면 확정"으로 감)
export async function createPrediction(params: {
  userId: string
  matchId: number
  homeTeam: string
  awayTeam: string
  predictedHomeScore: number
  predictedAwayScore: number
  kickoffAt: string
}): Promise<void> {
  await ensureTable()
  const sql = getSql()
  await sql`
    INSERT INTO predictions (user_id, match_id, home_team, away_team, predicted_home_score, predicted_away_score, kickoff_at)
    VALUES (${params.userId}, ${params.matchId}, ${params.homeTeam}, ${params.awayTeam}, ${params.predictedHomeScore}, ${params.predictedAwayScore}, ${params.kickoffAt})
    ON CONFLICT (user_id, match_id) DO NOTHING
  `
}

// 정산 대상: 아직 settled=false인 예측들의 고유 match_id 목록.
// 크론이 이 목록을 돌면서 각 경기가 실제로 끝났는지(FT) API로 확인한다
// (2026-09-21) 아직 시작도 안 한 경기까지 매 크론 실행마다 API로 "끝났는지"
// 확인하면 API 호출이 크게 낭비된다 — 예측은 경기 며칠 전부터도 걸 수 있어서,
// kickoff_at이 지난(=이미 시작된) 경기만 조회 대상으로 좁힌다. kickoff_at이
// NULL인 행(이 컬럼 추가 이전에 생성된 예측)은 안전하게 계속 포함해서
// 영원히 정산 안 되는 일이 없게 한다.
export async function getUnsettledMatchIds(limit = 50): Promise<number[]> {
  await ensureTable()
  const sql = getSql()
  const rows = await sql`
    SELECT DISTINCT match_id FROM predictions
    WHERE settled = false AND (kickoff_at IS NULL OR kickoff_at <= now())
    LIMIT ${limit}
  `
  return rows.map((r) => r.match_id as number)
}

// 한 경기에 대한 모든 예측을 실제 스코어 기준으로 정산.
// 스코어 정확히 맞음: 3점, 승/무/패만 맞음: 1점, 틀림: 0점
export async function settleMatchPredictions(
  matchId: number,
  actualHomeScore: number,
  actualAwayScore: number
): Promise<void> {
  await ensureTable()
  const sql = getSql()
  const rows = await sql`
    SELECT id, predicted_home_score, predicted_away_score FROM predictions
    WHERE match_id = ${matchId} AND settled = false
  `

  const actualResult =
    actualHomeScore === actualAwayScore ? "draw" : actualHomeScore > actualAwayScore ? "home" : "away"

  for (const row of rows) {
    const ph = row.predicted_home_score as number
    const pa = row.predicted_away_score as number
    const predictedResult = ph === pa ? "draw" : ph > pa ? "home" : "away"

    let points = 0
    if (ph === actualHomeScore && pa === actualAwayScore) points = 3
    else if (predictedResult === actualResult) points = 1

    await sql`
      UPDATE predictions
      SET actual_home_score = ${actualHomeScore}, actual_away_score = ${actualAwayScore},
          points = ${points}, settled = true
      WHERE id = ${row.id}
    `
  }
}

// 전체 기간 리더보드 (상위 N명)
export async function getLeaderboard(limit = 50): Promise<LeaderboardRow[]> {
  await ensureTable()
  const sql = getSql()
  const rows = await sql`
    SELECT
      user_id,
      COALESCE(SUM(points), 0) as total_points,
      COUNT(*) FILTER (WHERE settled = true) as total_predictions,
      COUNT(*) FILTER (WHERE points = 3) as exact_count
    FROM predictions
    WHERE settled = true
    GROUP BY user_id
    ORDER BY total_points DESC
    LIMIT ${limit}
  `
  return rows.map((r) => ({
    userId: r.user_id as string,
    totalPoints: Number(r.total_points),
    totalPredictions: Number(r.total_predictions),
    exactCount: Number(r.exact_count),
  }))
}

// 특정 유저의 예측 히스토리 (마이페이지/예측 페이지용)
export async function getUserPredictions(userId: string, limit = 50): Promise<Prediction[]> {
  await ensureTable()
  const sql = getSql()
  const rows = await sql`
    SELECT * FROM predictions WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit}
  `
  return rows.map(rowToPrediction)
}
