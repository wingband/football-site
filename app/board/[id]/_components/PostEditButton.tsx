"use client"

import Link from "next/link"
import { useUser } from "@clerk/nextjs"

// PostDeleteButton과 동일 패턴: 글쓴이 본인일 때만 보여준다.
// 실제 수정 권한은 서버(edit/page.tsx, PATCH API)가 검증한다.
export default function PostEditButton({
  postId,
  authorUserId,
}: {
  postId: number
  authorUserId: string
}) {
  const { user } = useUser()

  if (user?.id !== authorUserId) return null

  return (
    <Link
      href={`/board/${postId}/edit`}
      className="text-xs text-floodlight/40 hover:text-score-amber transition-colors"
    >
      수정
    </Link>
  )
}
