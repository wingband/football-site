import { NextRequest, NextResponse } from "next/server"
import { apiFetch } from "@/lib/matchApi"
import type { H2HMatch } from "@/lib/matchApi"

// 경기 상세 페이지의 "역대전적" 탭 전용 — 순위 탭과 같은 이유로 온디맨드 전환
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const homeId = Number(searchParams.get("homeId"))
  const awayId = Number(searchParams.get("awayId"))

  if (!homeId || !awayId) {
    return NextResponse.json({ error: "homeId/awayId required" }, { status: 400 })
  }

  const h2h = (await apiFetch(`/fixtures/headtohead?h2h=${homeId}-${awayId}&last=20`, 86400)) as H2HMatch[]
  return NextResponse.json({ h2h: h2h ?? [] })
}
