import { NextRequest, NextResponse } from "next/server"
import { isKnownCrawler } from "@/lib/crawlerDetect"
import { isAdmin } from "@/lib/admin"
import { getColumnBySlug, isValidColumnSlug } from "@/lib/columns"
import { incrementColumnView } from "@/lib/columnViews"

export const dynamic = "force-dynamic"

// 칼럼 조회 1회 기록. 크롤러·관리자 본인·비공개 글은 세지 않는다.
export async function POST(req: NextRequest) {
  const done = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
  if (isKnownCrawler(req.headers.get("user-agent"))) return done
  const body = await req.json().catch(() => ({}))
  const slug = typeof body?.slug === "string" ? body.slug : ""
  if (!isValidColumnSlug(slug)) return done
  if (await isAdmin()) return NextResponse.json({ ok: true, admin: true }, { headers: { "Cache-Control": "no-store" } })
  const column = await getColumnBySlug(slug)
  if (!column?.published) return done
  await incrementColumnView(slug)
  return done
}
