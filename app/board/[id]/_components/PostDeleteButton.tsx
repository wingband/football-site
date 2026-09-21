"use client"

import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"

// 글쓴이 본인일 때만 삭제 버튼을 보여준다. 서버는 별도로 userId를 다시
// 검증하므로(app/api/board/[id]/route.ts DELETE), 여기서 버튼을 숨기는 건
// UX 편의일 뿐 실제 권한 검사는 서버가 한다.
export default function PostDeleteButton({
  postId,
  authorUserId,
}: {
  postId: number
  authorUserId: string
}) {
  const { user } = useUser()
  const router = useRouter()

  if (user?.id !== authorUserId) return null

  async function handleDelete() {
    if (!confirm("정말 삭제하시겠습니까?")) return
    const res = await fetch(`/api/board/${postId}`, { method: "DELETE" })
    if (res.ok) {
      router.push("/board")
    } else {
      alert("삭제에 실패했습니다")
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="text-xs text-floodlight/40 hover:text-red-400 transition-colors"
    >
      삭제
    </button>
  )
}
