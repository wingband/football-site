import Link from "next/link"
import { notFound } from "next/navigation"
import { getPostById } from "@/lib/board"
import PostDeleteButton from "./_components/PostDeleteButton"
import PostEditButton from "./_components/PostEditButton"
import LikeButton from "./_components/LikeButton"
import BoardComments from "./_components/BoardComments"
import { boardCategory } from "@/lib/boardCategories"

export default async function BoardPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const post = await getPostById(parseInt(id))
  if (!post) notFound()
  const cat = boardCategory(post.category)
  const listHref = cat ? `/board?category=${cat.key}` : "/board"

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-2 text-xs">
          <Link href={listHref} className="text-floodlight/50 hover:text-floodlight transition-colors">
            ← {cat ? cat.title : "게시판"}
          </Link>
        </div>

        <div className="mt-4 pb-4 border-b border-turf-line/40">
          <h1 className="text-xl font-bold text-floodlight">{post.title}</h1>
          <p className="text-xs text-floodlight/40 mt-2">
            {post.nickname} · {new Date(post.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · 조회 {post.viewCount}
          </p>
        </div>

        <div className="py-6 text-sm text-floodlight/90 whitespace-pre-wrap leading-relaxed">
          {post.content}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-turf-line/40">
          <LikeButton postId={post.id} initialCount={post.likeCount} />
          <div className="flex items-center gap-3">
            <PostEditButton postId={post.id} authorUserId={post.userId} />
            <PostDeleteButton postId={post.id} authorUserId={post.userId} />
          </div>
        </div>

        <BoardComments postId={post.id} />
      </div>
    </main>
  )
}
