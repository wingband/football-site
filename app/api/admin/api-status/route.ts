import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// (2026-10-26) API-Football 구독 상태 확인. /status 호출은 일일 한도에 포함되지 않는다.
// /api/admin/usage처럼 민감정보 없이(키·계정 이메일 제외) 플랜·활성 여부·만료일·오늘 사용량과
// 실제 데이터 요청 1건의 오류 메시지만 보여준다. 확인 1건이 한도를 쓰므로 5분간 결과를 재사용한다.
let cached: { at: number; body: unknown } | null = null

export async function GET() {
  if (cached && Date.now() - cached.at < 300_000) return NextResponse.json(cached.body)
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
  const body = {
    checkedAt: new Date().toISOString(),
    keyConfigured: Boolean(process.env.API_FOOTBALL_KEY),
    status: { http: status.http, errors: status.errors, subscription: r?.subscription ?? null, requests: r?.requests ?? null },
    probeStandingsEPL2026: { http: probe.http, errors: probe.errors, results: probe.results },
  }
  cached = { at: Date.now(), body }
  return NextResponse.json(body)
}
