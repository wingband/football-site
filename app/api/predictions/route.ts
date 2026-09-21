import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getPrediction, createPrediction } from "@/lib/predictions"

// GET: 현재 로그인한 유저의 특정 경기 예측 여부 조회
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ prediction: null })

  const matchId = req.nextUrl.searchParams.get("matchId")
  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 })

  const prediction = await getPrediction(userId, parseInt(matchId))
  return NextResponse.json({ prediction })
}

// POST: 예측 제출. userId는 클라이언트가 아니라 서버 세션(auth())에서
// 직접 가져온다 — 댓글 API(app/api/comments)는 클라이언트가 보낸 userId를
// 그대로 믿는 구조였는데, 예측은 포인트/순위와 직결되니 위조 방지를 위해
// 서버 쪽 인증 세션 값만 신뢰한다.
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })

  const body = await req.json()
  const { matchId, homeTeam, awayTeam, predictedHomeScore, predictedAwayScore, kickoffAt, nickname } = body

  if (
    typeof matchId !== "number" ||
    typeof predictedHomeScore !== "number" ||
    typeof predictedAwayScore !== "number" ||
    predictedHomeScore < 0 ||
    predictedAwayScore < 0
  ) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 })
  }

  if (kickoffAt && new Date(kickoffAt).getTime() <= Date.now()) {
    return NextResponse.json({ error: "이미 시작된 경기는 예측할 수 없습니다" }, { status: 400 })
  }

  await createPrediction({
    userId,
    matchId,
    homeTeam,
    awayTeam,
    predictedHomeScore,
    predictedAwayScore,
    kickoffAt: kickoffAt ?? new Date().toISOString(),
    nickname: typeof nickname === "string" && nickname.trim() ? nickname.trim() : "익명",
  })

  return NextResponse.json({ ok: true })
}
