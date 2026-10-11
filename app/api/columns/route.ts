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
import { OPINION_PLACEHOLDER, WEEKLY_SLUG_MARK, weeklyAutoTags } from "@/lib/generateWeeklyColumn"

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
    ? body.tags.filter((t: unknown): t is string => typeof t === "string").map((t: string) => t.trim()).filter(Boolean).slice(0, 30)
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

  // 자동 생성 초안의 "내 의견" 자리를 비워둔 채로는 공개할 수 없다.
  // 사람의 의견이 들어가야 자동 생성 글이 아닌 칼럼이 된다 (애드센스 "가치 없는 콘텐츠" 대응)
  if (published && content.includes(OPINION_PLACEHOLDER)) {
    return NextResponse.json(
      { error: "'✍️ 내 의견' 자리에 직접 의견을 채운 뒤 공개할 수 있어요. 비공개로는 저장할 수 있습니다." },
      { status: 400 }
    )
  }

  // 발행된 글에는 초안용 "✍️ 내 의견:" 표시를 남기지 않는다 (의견 문장만 인용 블록으로 남김)
  const finalContent = published ? content.replace(/✍️\s*내\s*의견\s*[:：]\s*/g, "") : content

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

  // 주간 해외파 칼럼은 발행할 때 본문에서 선수·팀·리그 태그를 자동으로 채운다
  const finalTags = published && slug.includes(WEEKLY_SLUG_MARK) ? weeklyAutoTags(finalContent, tags) : tags

  await saveColumn({ slug, title, summary, content: finalContent, tags: finalTags, published })
  revalidatePath("/columns")
  revalidatePath(`/columns/${slug}`)
  revalidatePath("/sitemap.xml")

  return NextResponse.json({ ok: true, slug })
}
