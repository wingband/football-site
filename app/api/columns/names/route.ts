import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin"
import { setPlayerName } from "@/lib/playerNameKo"

// 관리자: 선수 한글 표기 고치기. body: { name: 영문 원래 이름, ko: 한글 표기 }
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const name = String(body?.name ?? "").trim()
  const ko = String(body?.ko ?? "").trim()
  if (!name || !ko || ko.length > 20) return NextResponse.json({ error: "이름을 확인해 주세요" }, { status: 400 })
  await setPlayerName(name, ko)
  return NextResponse.json({ ok: true })
}
