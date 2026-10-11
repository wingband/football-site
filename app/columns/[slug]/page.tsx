import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getColumnBySlug, isValidColumnSlug } from "@/lib/columns"
import { isAdmin } from "@/lib/admin"
import { SITE_URL } from "@/lib/siteConfig"
import ColumnBody from "@/components/ColumnBody"
import ShareButtons from "@/components/ShareButtons"
import ColumnViewBeacon from "@/components/ColumnViewBeacon"
import { getColumnViews } from "@/lib/columnViews"

export const dynamic = "force-dynamic"

async function loadColumn(slug: string) {
  if (!isValidColumnSlug(slug)) return null
  const column = await getColumnBySlug(slug)
  if (!column) return null
  // 비공개 글은 관리자에게만 보인다
  if (!column.published && !(await isAdmin())) return null
  return column
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const column = await loadColumn(slug)
  if (!column) return { title: "칼럼을 찾을 수 없습니다", robots: { index: false, follow: false } }

  const firstImage = column.content.match(/^!\[[^\]]*\]\((https:\/\/[^\s)]+)\)\s*$/m)?.[1]
  const description = column.summary || column.content.replace(/^!\[.*$/gm, "").replace(/[#>*~\-\[\]()]/g, "").trim().slice(0, 150)
  return {
    title: column.title,
    description,
    alternates: { canonical: `/columns/${column.slug}` },
    ...(column.tags.length ? { keywords: column.tags } : {}),
    ...(column.published ? {} : { robots: { index: false, follow: false } }),
    openGraph: {
      title: column.title,
      description,
      type: "article",
      // 본문 첫 이미지(주간 칼럼이면 평점 TOP 5 카드)를 공유 미리보기 이미지로 쓴다
      ...(firstImage ? { images: [{ url: firstImage, width: 1200, height: 630 }] } : {}),
      publishedTime: column.createdAt,
      modifiedTime: column.updatedAt,
    },
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default async function ColumnPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const column = await loadColumn(slug)
  if (!column) notFound()
  const admin = await isAdmin()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: column.title,
    description: column.summary || undefined,
    datePublished: column.createdAt,
    dateModified: column.updatedAt,
    author: { "@type": "Organization", name: "GoalLine", url: SITE_URL },
    publisher: { "@type": "Organization", name: "GoalLine", url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/columns/${column.slug}`,
    keywords: column.tags.join(", ") || undefined,
  }

  const edited = column.updatedAt.slice(0, 10) !== column.createdAt.slice(0, 10)
  // 조회수는 관리자에게만 보여준다 (방문자가 적을 때 공개하면 오히려 신뢰를 깎음)
  const views = admin && column.published ? (await getColumnViews()).get(column.slug) : undefined

  return (
    <main className="bg-pitch-night text-floodlight">
      {column.published && <ColumnViewBeacon slug={column.slug} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <article>
        <Link href="/columns" className="text-xs text-floodlight/50 hover:text-floodlight transition-colors">
          ← 칼럼 목록
        </Link>

        <header className="mt-5 pb-6 border-b border-turf-line/40">
          <p className="text-xs font-semibold tracking-wide text-score-amber mb-2">GOALLINE 칼럼</p>
          <h1 className="text-xl font-bold leading-snug text-floodlight">{column.title}</h1>
          {column.summary && <p className="text-sm text-floodlight/60 mt-3 leading-relaxed">{column.summary}</p>}
          <p className="text-xs text-floodlight/40 mt-4">
            GoalLine 편집부 · {formatDate(column.createdAt)}
            {edited && ` (수정 ${formatDate(column.updatedAt)})`}
            {!column.published && " · 비공개"}
            {admin && column.published && (
              <span className="text-score-amber/70"> · 조회 {views?.total ?? 0} (오늘 {views?.today ?? 0}) · 관리자만 보임</span>
            )}
          </p>
          {column.published && (
            <div className="mt-5">
              <ShareButtons url={`${SITE_URL}/columns/${column.slug}`} title={column.title} />
            </div>
          )}
        </header>

        <div className="py-8">
          <ColumnBody content={column.content} />
        </div>

          {column.tags.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-6">
              {column.tags.map((t) => (
                <span key={t} className="text-xs text-floodlight/45">#{t}</span>
              ))}
            </div>
          )}
        {column.published && (
          <div className="pb-8">
            <p className="text-sm text-floodlight/70 mb-3">이 글이 도움이 됐다면 축구 좋아하는 친구에게 공유해 주세요 ⚽</p>
            <ShareButtons url={`${SITE_URL}/columns/${column.slug}`} title={column.title} />
          </div>
        )}

        <footer className="pt-6 border-t border-turf-line/40 flex items-center justify-between">
          <Link href="/columns" className="text-sm text-floodlight/60 hover:text-floodlight transition-colors">
            다른 칼럼 보기 →
          </Link>
          {admin && (
            <Link
              href={`/columns/write?slug=${column.slug}`}
              className="text-xs px-3 py-1.5 border border-turf-line rounded text-floodlight/60 hover:text-floodlight transition-colors"
            >
              수정
            </Link>
          )}
        </footer>
      </article>
      </div>
    </main>
  )
}
