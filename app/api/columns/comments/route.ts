import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { isAdmin } from "@/lib/admin"
import { getColumnBySlug, isValidColumnSlug } from "@/lib/columns"
import { getColumnComments, createColumnComment, deleteColumnComment, hasRecentComment } from "@/lib/columnComments"

const MAX_LEN = 500
const MIN_INTERVAL_SEC = 10

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? ""
  if (!isValidColumnSlug(slug)) return NextResponse.json({ comments: [] })
  try {
    return NextResponse.json({ comments: await getColumnComments(slug) })
  } catch {
    return NextResponse.json({ comments: [], error: "댓글을 불러오지 못했어요" })
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const slug = typeof body.slug === "string" ? body.slug : ""
  const content = typeof body.content === "string" ? body.content.trim() : ""
  if (!isValidColumnSlug(slug)) return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 })
  if (!content) return NextResponse.json({ error: "내용을 입력해주세요" }, { status: 400 })
  if (content.length > MAX_LEN) return NextResponse.json({ error: `${MAX_LEN}자 이내로 작성해주세요` }, { status: 400 })

  // 공개된 칼럼에만 (비공개 글은 관리자만)
  const column = await getColumnBySlug(slug)
  if (!column || (!column.published && !(await isAdmin()))) return NextResponse.json({ error: "칼럼을 찾을 수 없어요" }, { status: 404 })

  try {
    if (await hasRecentComment(userId, MIN_INTERVAL_SEC)) {
      return NextResponse.json({ error: "잠시 후에 다시 작성해주세요" }, { status: 429 })
    }
    // 닉네임은 클라이언트가 보낸 값이 아니라 서버에서 로그인 정보로 정한다 (사칭 방지)
    const user = await currentUser()
    const nickname = user?.username ?? user?.firstName ?? user?.emailAddresses[0]?.emailAddress?.split("@")[0] ?? "익명"
    const comment = await createColumnComment({ slug, userId, nickname, content })
    return NextResponse.json({ ok: true, comment })
  } catch {
    return NextResponse.json({ error: "댓글을 저장하지 못했어요. 잠시 후 다시 시도해주세요" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })
  const id = Number(req.nextUrl.searchParams.get("id"))
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 })
  try {
    const ok = await deleteColumnComment(id, userId, await isAdmin())
    return NextResponse.json({ ok })
  } catch {
    return NextResponse.json({ error: "삭제하지 못했어요" }, { status: 500 })
  }
}
