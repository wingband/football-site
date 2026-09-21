import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createPost, getPosts } from "@/lib/board"

const MAX_TITLE_LENGTH = 100
const MAX_CONTENT_LENGTH = 5000
const MIN_CONTENT_LENGTH = 5

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const category = sp.get("category") ?? "free"
  const page = Math.max(parseInt(sp.get("page") ?? "1"), 1)

  const { posts, total } = await getPosts(category, page, 20)
  return NextResponse.json({ posts, total })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })

  const body = await req.json()
  const { title, content, nickname, category } = body

  if (typeof title !== "string" || typeof content !== "string") {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 })
  }

  const trimmedTitle = title.trim()
  const trimmedContent = content.trim()

  if (!trimmedTitle || trimmedTitle.length > MAX_TITLE_LENGTH) {
    return NextResponse.json({ error: `제목은 1~${MAX_TITLE_LENGTH}자로 입력해주세요` }, { status: 400 })
  }
  if (trimmedContent.length < MIN_CONTENT_LENGTH || trimmedContent.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json(
      { error: `내용은 ${MIN_CONTENT_LENGTH}~${MAX_CONTENT_LENGTH}자로 입력해주세요` },
      { status: 400 }
    )
  }

  const id = await createPost({
    userId,
    nickname: typeof nickname === "string" && nickname.trim() ? nickname.trim() : "익명",
    title: trimmedTitle,
    content: trimmedContent,
    category: typeof category === "string" ? category : "free",
  })

  return NextResponse.json({ ok: true, id })
}
