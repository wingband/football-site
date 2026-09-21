import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getComments, createComment } from "@/lib/board"

const MAX_COMMENT_LENGTH = 1000

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const comments = await getComments(parseInt(id))
  return NextResponse.json({ comments })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { content, nickname } = body

  if (typeof content !== "string" || !content.trim() || content.trim().length > MAX_COMMENT_LENGTH) {
    return NextResponse.json({ error: "댓글 내용을 확인해주세요" }, { status: 400 })
  }

  await createComment({
    postId: parseInt(id),
    userId,
    nickname: typeof nickname === "string" && nickname.trim() ? nickname.trim() : "익명",
    content: content.trim(),
  })

  return NextResponse.json({ ok: true })
}
