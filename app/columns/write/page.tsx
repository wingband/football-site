import type { Metadata } from "next"
import Link from "next/link"
import { isAdmin } from "@/lib/admin"
import { getColumnBySlug, isValidColumnSlug } from "@/lib/columns"
import ColumnEditor from "./_components/ColumnEditor"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "칼럼 쓰기",
  robots: { index: false, follow: false },
}

export default async function ColumnWritePage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>
}) {
  if (!(await isAdmin())) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight font-sans flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-floodlight/50 mb-4">칼럼은 운영자만 작성할 수 있습니다.</p>
          <Link href="/columns" className="text-sm text-score-amber underline">
            칼럼 목록으로
          </Link>
        </div>
      </main>
    )
  }

  const { slug } = await searchParams
  const existing = slug && isValidColumnSlug(slug) ? await getColumnBySlug(slug) : null

  return (
    <ColumnEditor
      initial={
        existing
          ? {
              slug: existing.slug,
              title: existing.title,
              summary: existing.summary,
              content: existing.content,
              tags: existing.tags.join(", "),
              published: existing.published,
            }
          : null
      }
    />
  )
}
