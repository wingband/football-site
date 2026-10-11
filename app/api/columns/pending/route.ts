import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin"
import { countPendingDrafts } from "@/lib/columns"
import { OPINION_PLACEHOLDER } from "@/lib/draftKinds"

export const dynamic = "force-dynamic"

// 관리자 헤더 배지: 총평 대기 초안 수. 관리자가 아니면 항상 0 (존재 여부도 노출하지 않음)
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ count: 0 }, { headers: { "Cache-Control": "private, no-store" } })
  const count = await countPendingDrafts(OPINION_PLACEHOLDER).catch(() => 0)
  return NextResponse.json({ count }, { headers: { "Cache-Control": "private, no-store" } })
}
