import type { Metadata } from "next"
import Link from "next/link"
import { getPosts } from "@/lib/board"
import { BOARD_CATEGORIES, boardCategory, boardCategoryLabel as categoryLabel, isBoardCategory } from "@/lib/boardCategories"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}): Promise<Metadata> {
  const { category } = await searchParams
  const cat = boardCategory(category)
  return {
    title: cat ? cat.title : "게시판",
    description: cat ? `GoalLine ${cat.title} — ${cat.desc}` : "GoalLine 축구 팬 게시판 — 자유, PL, K리그, 국가대표 이야기를 나눠보세요.",
    alternates: { canonical: cat ? `/board?category=${cat.key}` : "/board" },
  }
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

// 24시간 안에 올라온 글인지 (서버 렌더 시각 기준)
function isFresh(iso: string) {
  return Date.now() - new Date(iso).getTime() < 24 * 3600_000
}

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(parseInt(sp.page ?? "1"), 1)
  // 분류를 안 고르면 "전체" — 게시판이 여러 개라도 글이 한곳에 모여 보이게 기본값을 전체로 둔다
  const category = isBoardCategory(sp.category) ? sp.category : null
  const cat = boardCategory(category)
  const qs = (p: number) => `/board?${category ? `category=${category}&` : ""}page=${p}`
  const { posts, total } = await getPosts(category, page, 20)
  const totalPages = Math.max(Math.ceil(total / 20), 1)
  const writeHref = category ? `/board/write?category=${category}` : "/board/write"

  const pageWindowStart = Math.max(1, page - 4)
  const pageWindowEnd = Math.min(totalPages, pageWindowStart + 9)
  const pageNumbers = Array.from({ length: pageWindowEnd - pageWindowStart + 1 }, (_, i) => pageWindowStart + i)

  const tabs = [{ key: null as string | null, label: "전체" }, ...BOARD_CATEGORIES.map((c) => ({ key: c.key as string | null, label: c.label }))]

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5 text-floodlight">
      {/* 게시판 이름 + 글쓰기 */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
 <h1 className="text-xl font-bold text-floodlight">{cat ? cat.title : "게시판"}</h1>
          <p className="text-sm text-floodlight/70 mt-1 truncate">
            {cat ? cat.desc : "축구 이야기를 자유롭게 나누는 곳"} · 글 <b className="text-score-amber font-data">{total.toLocaleString("ko-KR")}</b>
          </p>
        </div>
        <Link href={writeHref} className="shrink-0 px-5 py-2 bg-score-amber text-pitch-night text-sm font-bold hover:bg-floodlight transition-colors">
          ✏️ 글쓰기
        </Link>
      </div>

      {/* 게시판 탭 (커뮤니티식 가로 탭) */}
      <nav aria-label="게시판 분류" className="border-b border-turf-line/50">
        <ul className="flex flex-wrap">
          {tabs.map((t) => {
            const active = t.key === category
            return (
              <li key={t.key ?? "all"}>
                <Link
                  href={t.key ? `/board?category=${t.key}` : "/board"}
                  className={`block px-3.5 py-2.5 text-sm -mb-px border-b-2 transition-colors ${
                    active ? "border-score-amber text-score-amber font-bold" : "border-transparent text-floodlight/80 hover:text-floodlight"
                  }`}
                >
                  {t.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* 글 목록 — 표 형태 */}
      <div>
        <div className="hidden sm:grid grid-cols-[88px_minmax(0,1fr)_120px_64px_56px_48px] gap-2 px-3 py-2 text-xs text-floodlight/55 border-b border-turf-line/50 text-center">
          <span>분류</span>
          <span>제목</span>
          <span>글쓴이</span>
          <span>날짜</span>
          <span>조회</span>
          <span>추천</span>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-14 px-4">
            <p className="text-sm font-semibold text-floodlight">{cat ? `${cat.title}에 아직 글이 없어요` : "아직 게시글이 없어요"}</p>
            <p className="text-sm text-floodlight/70 mt-1">첫 글의 주인공이 되어보세요!</p>
            <Link href={writeHref} className="inline-block mt-4 px-5 py-2 bg-score-amber text-pitch-night text-sm font-bold hover:bg-floodlight transition-colors">
              ✏️ 첫 글 쓰기
            </Link>
          </div>
        ) : (
          <ul>
            {posts.map((post) => {
              const fresh = isFresh(post.createdAt)
              const hot = post.likeCount >= 3 || post.commentCount >= 5 || post.viewCount >= 100
              const title = (
                <span className="min-w-0">
                  <span className="text-sm text-floodlight group-hover:text-score-amber transition-colors">{post.title}</span>
                  {post.commentCount > 0 && <span className="ml-1.5 text-score-amber text-xs font-bold font-data">[{post.commentCount}]</span>}
                  {fresh && <span className="ml-1.5 text-xs font-bold px-1 py-px rounded bg-red-500 text-white align-middle">N</span>}
                  {hot && <span className="ml-1 text-xs font-bold px-1 py-px rounded bg-score-amber text-pitch-night align-middle">HOT</span>}
                </span>
              )
              return (
                <li key={post.id} className="border-b border-turf-line/30">
                  <Link href={`/board/${post.id}`} className="group block hover:bg-turf-line/20 transition-colors">
                    {/* 데스크톱 */}
                    <div className="hidden sm:grid grid-cols-[88px_minmax(0,1fr)_120px_64px_56px_48px] gap-2 px-3 py-2.5 items-center text-sm">
                      <span className="text-center text-xs text-floodlight/75">{categoryLabel(post.category)}</span>
                      {title}
                      <span className="text-center truncate text-floodlight/85">{post.nickname}</span>
                      <span className="text-center font-data text-xs text-floodlight/65">{formatBoardDate(post.createdAt)}</span>
                      <span className="text-center font-data text-xs text-floodlight/65">{post.viewCount}</span>
                      <span className={`text-center font-data text-xs ${post.likeCount > 0 ? "text-score-amber font-bold" : "text-floodlight/65"}`}>{post.likeCount}</span>
                    </div>
                    {/* 모바일 */}
                    <div className="sm:hidden px-3 py-2.5">
                      <p className="leading-snug">
                        <span className="text-xs text-score-amber/90 mr-1.5">[{categoryLabel(post.category)}]</span>
                        {title}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-floodlight/65">
                        <span className="text-floodlight/85">{post.nickname}</span>
                        <span className="font-data">{formatBoardDate(post.createdAt)}</span>
                        <span>조회 {post.viewCount}</span>
                        <span className={post.likeCount > 0 ? "text-score-amber font-semibold" : ""}>추천 {post.likeCount}</span>
                      </p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 text-sm">
          {pageWindowStart > 1 && (
            <Link href={qs(Math.max(1, page - 10))} className="px-3 py-1.5 text-floodlight/70 hover:text-floodlight">
              ‹ 이전
            </Link>
          )}
          {pageNumbers.map((p) => (
            <Link
              key={p}
              href={qs(p)}
              className={`min-w-8 h-8 px-2 flex items-center justify-center border ${
                p === page ? "bg-score-amber text-pitch-night border-score-amber font-bold" : "border-turf-line text-floodlight/75 hover:border-floodlight/40"
              }`}
            >
              {p}
            </Link>
          ))}
          {pageWindowEnd < totalPages && (
            <Link href={qs(Math.min(totalPages, page + 10))} className="px-3 py-1.5 text-floodlight/70 hover:text-floodlight">
              다음 ›
            </Link>
          )}
        </div>
      )}
    </main>
  )
}
