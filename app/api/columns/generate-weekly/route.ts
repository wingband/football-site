import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin"
import { generateWeeklyKoreanDraft } from "@/lib/generateWeeklyColumn"
import { revalidatePath } from "next/cache"

export const maxDuration = 60

// 관리자가 /columns에서 "이번 주 해외파 초안 만들기"를 눌렀을 때. 이미 이번 주 초안이
// 있으면 새로 만들지 않고 그 초안으로 보낸다(force는 쓰지 않음 — OpenAI 비용 중복 방지).
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
  }
  try {
    const result = await generateWeeklyKoreanDraft()
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 })
    revalidatePath("/columns")
    return NextResponse.json(result)
  } catch (err) {
    console.error("주간 초안 생성 실패:", err)
    return NextResponse.json({ error: "초안 생성에 실패했습니다" }, { status: 500 })
  }
}
