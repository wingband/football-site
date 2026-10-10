import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { isAdmin } from "@/lib/admin"
import {
  saveColumn,
  getColumnBySlug,
  makeColumnSlug,
  isValidColumnSlug,
  COLUMN_TITLE_MAX,
  COLUMN_SUMMARY_MAX,
  COLUMN_CONTENT_MAX,
} from "@/lib/columns"

// 칼럼 저장(새 글 작성 + 기존 글 수정). 관리자만 가능.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body.title !== "string" || typeof body.content !== "string") {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 })
  }

  const title = body.title.trim()
  const content = body.content.trim()
  const summary = typeof body.summary === "string" ? body.summary.trim() : ""
  const tags: string[] = Array.isArray(body.tags)
    ? body.tags.filter((t: unknown): t is string => typeof t === "string").map((t: string) => t.trim()).filter(Boolean).slice(0, 10)
    : []
  const published = body.published !== false

  if (!title || title.length > COLUMN_TITLE_MAX) {
    return NextResponse.json({ error: `제목은 1~${COLUMN_TITLE_MAX}자로 입력해주세요` }, { status: 400 })
  }
  if (summary.length > COLUMN_SUMMARY_MAX) {
    return NextResponse.json({ error: `요약은 ${COLUMN_SUMMARY_MAX}자 이내로 입력해주세요` }, { status: 400 })
  }
  if (content.length < 50 || content.length > COLUMN_CONTENT_MAX) {
    return NextResponse.json({ error: `본문은 50~${COLUMN_CONTENT_MAX}자로 입력해주세요` }, { status: 400 })
  }

  // 수정이면 기존 slug 유지, 새 글이면 생성
  let slug: string
  if (typeof body.slug === "string" && body.slug) {
    if (!isValidColumnSlug(body.slug) || !(await getColumnBySlug(body.slug))) {
      return NextResponse.json({ error: "수정할 글을 찾을 수 없습니다" }, { status: 404 })
    }
    slug = body.slug
  } else {
    slug = makeColumnSlug(title)
  }

  await saveColumn({ slug, title, summary, content, tags, published })
  revalidatePath("/columns")
  revalidatePath(`/columns/${slug}`)
  revalidatePath("/sitemap.xml")

  return NextResponse.json({ ok: true, slug })
}
