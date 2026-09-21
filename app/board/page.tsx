import type { Metadata } from "next"
import Link from "next/link"
import { getPosts } from "@/lib/board"

export const metadata: Metadata = {
  title: "자유게시판",
  description: "GoalLine 이용자들의 자유게시판입니다.",
}

// 팀별 게시판으로 확장되면 여기에 카테고리 라벨만 추가하면 됨
const CATEGORY_LABELS: Record<string, string> = {
  free: "자유",
}

function categoryLabel(category: string) {
  return CATEGORY_LABELS[category] ?? category
}

// 서버가 어느 시간대(Vercel 서버리스는 보통 UTC)로 돌든 항상 한국 시간
// 기준으로 나오도록 Intl.DateTimeFormat에 timeZone을 명시한다.
// Date의 getFullYear()/getDate() 등은 서버의 로컬 시간대를 따르므로
// "오늘인지" 판단에도 절대 쓰면 안 됨 — KST 기준 날짜 문자열로 직접 비교한다.
const KST_TIME_ZONE = "Asia/Seoul"

function kstDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return { year: get("year"), month: get("month"), day: get("day") }
}

function formatBoardDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const dParts = kstDateParts(d)
  const nowParts = kstDateParts(now)
  const sameDay =
    dParts.year === nowParts.year && dParts.month === nowParts.month && dParts.day === nowParts.day

  if (sameDay) {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: KST_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d)
  }
  if (dParts.year === nowParts.year) return `${dParts.month}.${dParts.day}`
  return `${dParts.year.slice(2)}.${dParts.month}.${dParts.day}`
}

const ROW_GRID_COLS = "md:grid-cols-[56px_minmax(0,1fr)_100px_70px_56px_56px]"

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(parseInt(sp.page ?? "1"), 1)
  const { posts, total } = await getPosts(null, page, 20)
  const totalPages = Math.max(Math.ceil(total / 20), 1)

  const pageWindowStart = Math.max(1, page - 4)
  const pageWindowEnd = Math.min(totalPages, pageWindowStart + 9)
  const pageNumbers = Array.from(
    { length: pageWindowEnd - pageWindowStart + 1 },
    (_, i) => pageWindowStart + i
  )

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="pt-8 pb-4 border-b border-turf-line/40 flex items-center justify-between">
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
          <div className="mt-4">
            <div
              className={`hidden md:grid ${ROW_GRID_COLS} gap-2 px-2 pb-2 border-b border-turf-line/40 text-[11px] text-floodlight/40 font-bold`}
            >
              <span>분류</span>
              <span>제목</span>
              <span>글쓴이</span>
              <span>날짜</span>
              <span className="text-right">조회</span>
              <span className="text-right">추천</span>
            </div>

            <div className="divide-y divide-turf-line/20">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/board/${post.id}`}
                  className={`flex flex-col md:grid ${ROW_GRID_COLS} gap-1 md:gap-2 md:items-center px-2 py-2.5 odd:bg-transparent even:bg-white/[0.02] hover:bg-turf-line/20 transition-colors`}
                >
                  <span className="hidden md:block text-[11px] text-floodlight/40 truncate">
                    {categoryLabel(post.category)}
                  </span>
                  <span className="min-w-0">
                    <span className="text-sm text-floodlight truncate block">
                      {post.title}
                      {post.commentCount > 0 && (
                        <span className="text-score-amber text-xs font-bold ml-1">
                          [{post.commentCount}]
                        </span>
                      )}
                    </span>
                    <span className="md:hidden text-[11px] text-floodlight/40 mt-0.5 block">
                      {post.nickname} · {formatBoardDate(post.createdAt)} · 조회 {post.viewCount}
                    </span>
                  </span>
                  <span className="hidden md:block text-[11px] text-floodlight/60 truncate">
                    {post.nickname}
                  </span>
                  <span className="hidden md:block text-[11px] text-floodlight/40">
                    {formatBoardDate(post.createdAt)}
                  </span>
                  <span className="hidden md:block text-[11px] text-floodlight/40 text-right">
                    {post.viewCount}
                  </span>
                  <span className="hidden md:block text-[11px] text-right">
                    {post.likeCount > 0 ? (
                      <span className="text-score-amber font-bold">{post.likeCount}</span>
                    ) : (
                      <span className="text-floodlight/30">0</span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 mt-8 text-xs">
            {pageWindowStart > 1 && (
              <Link
                href={`/board?page=${Math.max(1, page - 10)}`}
                className="px-2 py-1 text-floodlight/50 hover:text-floodlight"
              >
                ‹ 이전
              </Link>
            )}
            {pageNumbers.map((p) => (
              <Link
                key={p}
                href={`/board?page=${p}`}
                className={`w-8 h-8 flex items-center justify-center rounded ${
                  p === page ? "bg-score-amber text-pitch-night font-bold" : "text-floodlight/50 hover:bg-turf-line/30"
                }`}
              >
                {p}
              </Link>
            ))}
            {pageWindowEnd < totalPages && (
              <Link
                href={`/board?page=${Math.min(totalPages, page + 10)}`}
                className="px-2 py-1 text-floodlight/50 hover:text-floodlight"
              >
                다음 ›
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
