import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { isAdmin } from "@/lib/admin"

// 칼럼 본문 이미지 업로드 (관리자 전용, 2026-10-11).
// 저장소는 Vercel Blob — Vercel 프로젝트 Storage 탭에서 Blob 스토어를 연결하면
// BLOB_READ_WRITE_TOKEN 환경변수가 자동으로 생긴다. 브라우저에서 미리 1600px로
// 줄여서 보내므로(ColumnImageUpload) 서버리스 요청 한도(4.5MB) 안쪽으로 들어온다.
const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "이미지 저장소가 아직 연결되지 않았어요. Vercel → Storage에서 Blob을 연결해 주세요." },
      { status: 503 }
    )
  }

  const form = await req.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "이미지 파일이 없습니다" }, { status: 400 })
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "JPG, PNG, WEBP, GIF 이미지만 올릴 수 있어요" }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "이미지가 너무 커요 (4MB 이하)" }, { status: 400 })
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg")
  try {
    const blob = await put(`columns/${new Date().toISOString().slice(0, 10)}.${ext}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    })
    return NextResponse.json({ url: blob.url })
  } catch (err) {
    console.error("칼럼 이미지 업로드 실패:", err)
    return NextResponse.json({ error: "업로드에 실패했습니다" }, { status: 500 })
  }
}
