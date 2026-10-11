import { NextRequest, NextResponse } from "next/server"
import { runDraft } from "@/lib/draftRunner"

export const maxDuration = 120

// 월요일 10:30(KST) — K리그1 라운드 정리 초안 (vercel.json). 발행 전 초안이 있으면 최신 데이터로 다시 쓴다.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 })
  }
  try {
    return NextResponse.json(await runDraft("kleague", true))
  } catch (err) {
    console.error("kleague-round 실패:", err)
    return NextResponse.json({ ok: false, error: "초안 생성 실패" }, { status: 500 })
  }
}
