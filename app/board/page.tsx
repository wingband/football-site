import type { Metadata } from "next"
import Link from "next/link"
import { getPosts } from "@/lib/board"

export const metadata: Metadata = {
  title: "자유게시판",
  description: "GoalLine 이용자들의 자유게시판입니다.",
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return "방금"
  if (m < 60) return `${m}분 전`
  if (h < 24) return `${h}시간 전`
  if (d < 7) return `${d}일 전`
  return new Date(dateStr).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })
}

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(parseInt(sp.page ?? "1"), 1)
  const { posts, total } = await getPosts("free", page, 20)
  const totalPages = Math.max(Math.ceil(total / 20), 1)

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <div className="pt-8 pb-6 border-b border-turf-line/40 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">💬</span>
              <h1 className="font-display uppercase text-2xl text-score-amber">자유게시판</h1>
            </div>
            <p className="text-sm text-floodlight/50">축구 얘기, 아무 얘기나 편하게 남겨주세요</p>
          </div>
          <Link
            href="/board/write"
            className="shrink-0 text-xs px-4 py-2 bg-score-amber text-pitch-night font-bold rounded hover:bg-score-amber/80 transition-colors"
          >
            글쓰기
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="mt-8 text-center text-floodlight/40 text-sm py-12">
            아직 게시글이 없습니다. 첫 글을 남겨보세요!
          </div>
        ) : (
          <div className="mt-4 divide-y divide-turf-line/30">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/board/${post.id}`}
                className="flex items-center gap-3 px-2 py-3 hover:bg-turf-line/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-floodlight truncate">{post.title}</p>
                  <p className="text-[11px] text-floodlight/40 mt-0.5">
                    {post.nickname} · {timeAgo(post.createdAt)} · 조회 {post.viewCount}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/board?page=${p}`}
                className={`w-8 h-8 flex items-center justify-center rounded text-xs ${
                  p === page ? "bg-score-amber text-pitch-night font-bold" : "text-floodlight/50 hover:bg-turf-line/30"
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
