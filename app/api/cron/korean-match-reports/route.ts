import { NextRequest, NextResponse } from "next/server"
import { runDraft, cleanupStaleReportDrafts } from "@/lib/draftRunner"

export const maxDuration = 300

// 3시간마다 — 해외파 출전 경기가 끝나면 선수별 리포트 초안을 만든다 (vercel.json).
// 오래된(7일+) 미발행 리포트 초안 정리도 같이 한다.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 })
  }
  try {
    const result = await runDraft("report")
    // 유럽 빅클럽 경기 리포트 초안도 같은 주기로 (한 쪽이 실패해도 다른 쪽은 진행)
    const club = await runDraft("club").catch((e) => ({ ok: false, error: String(e) }))
    const cleaned = await cleanupStaleReportDrafts()
    return NextResponse.json({ ...result, club, cleaned })
  } catch (err) {
    console.error("korean-match-reports 실패:", err)
    return NextResponse.json({ ok: false, error: "리포트 생성 실패" }, { status: 500 })
  }
}
