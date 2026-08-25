import { NextRequest, NextResponse } from "next/server"

// API-Football 키/쿼터 상태를 바로 확인하는 진단 엔드포인트.
// /status는 API-Football 공식 문서상 쿼터를 소모하지 않는 상태조회용 엔드포인트라
// 안심하고 브라우저에서 바로 열어봐도 된다.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const secretParam = req.nextUrl.searchParams.get("secret")
  const isAuthorized =
    !process.env.CRON_SECRET ||
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    secretParam === process.env.CRON_SECRET
  if (!isAuthorized) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 })
  }

  const hasKey = Boolean(process.env.API_FOOTBALL_KEY)
  if (!hasKey) {
    return NextResponse.json({
      ok: false,
      diagnosis: "API_FOOTBALL_KEY 환경변수가 설정되어 있지 않습니다. Vercel 프로젝트 환경변수를 확인하세요.",
    })
  }

  try {
    const res = await fetch("https://v3.football.api-sports.io/status", {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      cache: "no-store",
    })
    const data = await res.json()

    return NextResponse.json({
      ok: res.ok,
      httpStatus: res.status,
      apiErrors: data?.errors ?? null,
      account: data?.response?.account ?? null,
      subscription: data?.response?.subscription ?? null,
      requests: data?.response?.requests ?? null,
      keyPreview: `${process.env.API_FOOTBALL_KEY!.slice(0, 4)}...${process.env.API_FOOTBALL_KEY!.slice(-4)}`,
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      diagnosis: "API-Football로 요청 자체가 실패했습니다 (네트워크/DNS 등).",
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
