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
    description: cat ? `GoalLine ${cat.title} — ${cat.desc}` : "GoalLine 축구 팬 게시판 — 자유, 해외파, 리그별 이야기를 나눠보세요.",
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

// 게시판별 아이콘 — 목록에서 한눈에 구분되도록 (2026-10-12 게시판 개편)
const CATEGORY_ICON: Record<string, string> = {
  free: "💬",
  abroad: "🌍",
  epl: "🇬🇧",
  laliga: "🇪🇸",
  bundesliga: "🇩🇪",
  seriea: "🇮🇹",
  ligue1: "🇫🇷",
  ucl: "🏆",
  kleague: "🏟️",
  national: "🇰🇷",
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

  const tabs = [{ key: null as string | null, label: "전체", icon: "📋" }, ...BOARD_CATEGORIES.map((c) => ({ key: c.key as string | null, label: c.label, icon: CATEGORY_ICON[c.key] ?? "⚽" }))]

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-floodlight">
      {/* 히어로 */}
      <section className="relative overflow-hidden rounded-2xl border border-score-amber/40 bg-gradient-to-br from-turf via-turf/70 to-pitch-night p-5 sm:p-7">
        <div className="absolute -right-6 -top-6 text-[120px] sm:text-[160px] leading-none opacity-10 select-none" aria-hidden>⚽</div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-score-amber tracking-wide">GOALLINE 축구 팬 놀이터</p>
            <h1 className="font-display text-3xl sm:text-4xl text-floodlight mt-1">
              {CATEGORY_ICON[category ?? ""] ?? "💬"} {cat ? cat.title : "게시판"}
            </h1>
            <p className="text-sm sm:text-base text-floodlight/80 mt-2">{cat ? cat.desc : "경기 얘기, 이적 루머, 응원하는 팀 자랑까지 — 아무 얘기나 편하게 남겨보세요"}</p>
            <p className="text-sm text-floodlight/65 mt-2">
              {cat ? cat.label : "전체"} 게시글 <b className="text-score-amber font-data">{total.toLocaleString("ko-KR")}</b>개
            </p>
          </div>
          <Link
            href={writeHref}
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-score-amber text-pitch-night text-base font-bold shadow-lg shadow-score-amber/20 hover:bg-floodlight transition-colors"
          >
            ✏️ 글쓰기
          </Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr] items-start">
        {/* 게시판 목록 — 데스크톱은 왼쪽 세로 메뉴, 모바일은 가로 스크롤 */}
        <nav aria-label="게시판 분류" className="lg:sticky lg:top-20 rounded-2xl lg:border lg:border-turf-line/60 lg:bg-turf/40 lg:p-2">
          <ul className="flex lg:flex-col gap-1.5 lg:gap-0.5 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 pb-1 lg:pb-0 [scrollbar-width:none]">
            {tabs.map((t) => {
              const active = t.key === category
              return (
                <li key={t.key ?? "all"} className="shrink-0">
                  <Link
                    href={t.key ? `/board?category=${t.key}` : "/board"}
                    className={`flex items-center gap-2 px-3.5 py-2 lg:py-2.5 rounded-full lg:rounded-xl border lg:border-0 text-sm transition-colors ${
                      active
                        ? "bg-score-amber text-pitch-night border-score-amber font-bold"
                        : "border-turf-line text-floodlight/85 hover:text-floodlight hover:border-floodlight/40 lg:hover:bg-turf-line/40"
                    }`}
                  >
                    <span aria-hidden>{t.icon}</span>
                    {t.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* 글 목록 */}
        <div className="min-w-0">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-score-amber/50 bg-turf/30 text-center py-14 px-4">
              <p className="text-4xl mb-3">📝</p>
              <p className="text-base sm:text-lg font-semibold text-floodlight">
                {cat ? `${cat.title}에 아직 글이 없어요` : "아직 게시글이 없어요"}
              </p>
              <p className="text-sm text-floodlight/70 mt-1">첫 글의 주인공이 되어보세요!</p>
              <Link href={writeHref} className="inline-block mt-5 px-6 py-2.5 rounded-full bg-score-amber text-pitch-night font-bold hover:bg-floodlight transition-colors">
                ✏️ 첫 글 쓰기
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {posts.map((post) => {
                const fresh = isFresh(post.createdAt)
                const hot = post.likeCount >= 3 || post.commentCount >= 5 || post.viewCount >= 100
                return (
                  <li key={post.id}>
                    <Link
                      href={`/board/${post.id}`}
                      className="block rounded-2xl border border-turf-line/60 bg-turf/40 p-4 sm:p-5 hover:border-score-amber/60 hover:bg-turf/60 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs sm:text-sm font-semibold px-2.5 py-0.5 rounded-full bg-turf-line/70 text-floodlight/90">
                          {CATEGORY_ICON[post.category] ?? "⚽"} {categoryLabel(post.category)}
                        </span>
                        {fresh && <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white">NEW</span>}
                        {hot && <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-score-amber text-pitch-night">HOT</span>}
                        <span className="ml-auto text-xs sm:text-sm text-floodlight/65 font-data">{formatBoardDate(post.createdAt)}</span>
                      </div>
                      <h2 className="text-base sm:text-lg font-semibold leading-snug text-floodlight">
                        {post.title}
                        {post.commentCount > 0 && <span className="ml-1.5 text-score-amber text-sm font-bold">[{post.commentCount}]</span>}
                      </h2>
                      <p className="mt-2 flex items-center gap-3 text-xs sm:text-sm text-floodlight/70">
                        <span className="font-semibold text-floodlight/85">{post.nickname}</span>
                        <span>👁 {post.viewCount}</span>
                        <span className={post.likeCount > 0 ? "text-score-amber font-semibold" : ""}>👍 {post.likeCount}</span>
                        <span>💬 {post.commentCount}</span>
                      </p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-8 text-sm">
              {pageWindowStart > 1 && (
                <Link href={qs(Math.max(1, page - 10))} className="px-3 py-1.5 text-floodlight/70 hover:text-floodlight">
                  ‹ 이전
                </Link>
              )}
              {pageNumbers.map((p) => (
                <Link
                  key={p}
                  href={qs(p)}
                  className={`w-9 h-9 flex items-center justify-center rounded-full border ${
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
        </div>
      </div>
    </main>
  )
}
