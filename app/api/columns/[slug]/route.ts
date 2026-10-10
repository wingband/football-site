import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { isAdmin } from "@/lib/admin"
import { deleteColumn, isValidColumnSlug } from "@/lib/columns"

// 칼럼 삭제. 관리자만 가능.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
  }
  const { slug } = await params
  if (!isValidColumnSlug(slug)) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 })
  }
  await deleteColumn(slug)
  revalidatePath("/columns")
  revalidatePath(`/columns/${slug}`)
  revalidatePath("/sitemap.xml")
  return NextResponse.json({ ok: true })
}
