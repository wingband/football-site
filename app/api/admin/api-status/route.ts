import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin"

export const dynamic = "force-dynamic"

// (2026-10-26) API-Football 구독 상태 확인 (관리자 전용). /status 호출은 일일 한도에 포함되지 않는다.
// 키 값은 응답에 담지 않고, 플랜·만료일·오늘 사용량과 실제 데이터 요청 1건의 오류 메시지만 보여준다.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
  const headers = { "x-apisports-key": process.env.API_FOOTBALL_KEY ?? "" }
  const get = async (path: string) => {
    try {
      const res = await fetch(`https://v3.football.api-sports.io${path}`, { headers, cache: "no-store" })
      const data = await res.json()
      return { http: res.status, errors: data?.errors ?? null, results: data?.results ?? null, response: data?.response ?? null }
    } catch (e) {
      return { http: 0, errors: e instanceof Error ? e.message : String(e), results: null, response: null }
    }
  }
  const status = await get("/status")
  const r = status.response as { subscription?: unknown; requests?: unknown; account?: { plan?: unknown } } | null
  const probe = await get("/standings?league=39&season=2026")
  return NextResponse.json({
    keyConfigured: Boolean(process.env.API_FOOTBALL_KEY),
    status: { http: status.http, errors: status.errors, subscription: r?.subscription ?? null, requests: r?.requests ?? null },
    probeStandingsEPL2026: { http: probe.http, errors: probe.errors, results: probe.results },
  })
}
