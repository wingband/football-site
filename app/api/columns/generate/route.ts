import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { isAdmin } from "@/lib/admin"
import { runDraft } from "@/lib/draftRunner"
import { DRAFT_KINDS, type DraftKind } from "@/lib/draftEngine"

export const maxDuration = 300

// 관리자: 초안 종류를 골라 지금 바로 만들기 / 다시 만들기
// body: { kind: "weekly" | "weekend" | "report" | "kleague", refresh?: boolean }
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const kind = body?.kind as DraftKind
  if (!(kind in DRAFT_KINDS)) return NextResponse.json({ error: "잘못된 초안 종류" }, { status: 400 })
  try {
    const result = await runDraft(kind, body?.refresh === true)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 })
    revalidatePath("/columns")
    return NextResponse.json(result)
  } catch (err) {
    console.error("초안 생성 실패:", err)
    return NextResponse.json({ error: "초안 생성에 실패했습니다" }, { status: 500 })
  }
}
