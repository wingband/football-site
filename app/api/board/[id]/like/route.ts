import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { likePost, hasLiked } from "@/lib/board"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ liked: false })

  const { id } = await params
  const liked = await hasLiked(parseInt(id), userId)
  return NextResponse.json({ liked })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 })

  const { id } = await params
  const succeeded = await likePost(parseInt(id), userId)
  return NextResponse.json({ ok: true, succeeded })
}
