import { NextResponse } from "next/server"
import { checkApiFootballStatus } from "@/lib/apiFootballStatus"

// API-Football 키/쿼터 상태를 바로 확인하는 진단 엔드포인트.
// 조회 전용이고 키도 마스킹해서 보여주므로 별도 인증 없이 열 수 있게 해둔다.
export async function GET() {
  const status = await checkApiFootballStatus()
  const key = process.env.API_FOOTBALL_KEY

  return NextResponse.json({
    ...status,
    keyPreview: key ? `${key.slice(0, 4)}...${key.slice(-4)}` : null,
  })
}
