import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getPostById, deletePost } from "@/lib/board"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await getPostById(parseInt(id))
  if (!post) return NextResponse.json({ error: "글을 찾을 수 없습니다" }, { status: 404 })
  return NextResponse.json({ post })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })

  const { id } = await params
  const deleted = await deletePost(parseInt(id), userId)
  if (!deleted) return NextResponse.json({ error: "삭제 권한이 없습니다" }, { status: 403 })
  return NextResponse.json({ ok: true })
}
