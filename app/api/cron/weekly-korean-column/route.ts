import { NextRequest, NextResponse } from "next/server"
import { generateWeeklyKoreanDraft } from "@/lib/generateWeeklyColumn"

export const maxDuration = 60

// 매주 월요일 10:00(KST)에 주간 해외파 칼럼 "초안"을 비공개로 만들어 둔다 (vercel.json).
// 주말 유럽 경기가 다 끝난 뒤라 한 주 정리에 맞는 시점. 공개는 운영자가 의견을 채운 뒤 직접 한다.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 })
  }
  try {
    const result = await generateWeeklyKoreanDraft()
    return NextResponse.json(result)
  } catch (err) {
    console.error("weekly-korean-column 실패:", err)
    return NextResponse.json({ ok: false, error: "초안 생성 실패" }, { status: 500 })
  }
}
