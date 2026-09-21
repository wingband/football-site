import { notFound, redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { getPostRaw } from "@/lib/board"
import BoardEditForm from "./_components/BoardEditForm"

export default async function BoardEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const post = await getPostRaw(parseInt(id))
  if (!post) notFound()

  // 서버에서 먼저 글쓴이 본인인지 확인 — 아니면 상세 페이지로 돌려보낸다.
  // (실제 저장 권한은 PATCH API에서 다시 한번 검증)
  const { userId } = await auth()
  if (userId !== post.userId) {
    redirect(`/board/${post.id}`)
  }

  return <BoardEditForm post={post} />
}
