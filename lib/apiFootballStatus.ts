import { cache } from "react"

// API-Football 연결 상태를 확인하는 공용 헬퍼.
// /status는 API-Football 공식 문서상 쿼터를 소모하지 않는 상태조회용 엔드포인트라
// 다른 호출이 실패했을 때 원인 파악용으로 안전하게 추가로 불러도 된다.
export type ApiFootballStatus = {
  ok: boolean
  message: string | null
  raw: unknown
}

// layout.tsx와 page.tsx가 둘 다 실패 시 이 함수를 부를 수 있어서, 같은 요청 안에서는
// cache()로 한 번만 실제로 호출되게 한다
export const checkApiFootballStatus = cache(async function checkApiFootballStatus(): Promise<ApiFootballStatus> {
  if (!process.env.API_FOOTBALL_KEY) {
    return {
      ok: false,
      message: "API_FOOTBALL_KEY 환경변수가 설정되어 있지 않습니다.",
      raw: null,
    }
  }

  try {
    const res = await fetch("https://v3.football.api-sports.io/status", {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY },
      cache: "no-store",
    })
    const data = await res.json()

    const errors = data?.errors
    const hasErrors = errors && (Array.isArray(errors) ? errors.length > 0 : Object.keys(errors).length > 0)

    if (!res.ok || hasErrors) {
      const reason =
        errors && typeof errors === "object" && !Array.isArray(errors)
          ? String(Object.values(errors)[0])
          : Array.isArray(errors) && errors.length > 0
            ? String(errors[0])
            : `HTTP ${res.status}`
      return { ok: false, message: reason, raw: data }
    }

    return { ok: true, message: null, raw: data }
  } catch (err) {
    return {
      ok: false,
      message: "API-Football 요청 자체가 실패했습니다 (네트워크 오류).",
      raw: err instanceof Error ? err.message : String(err),
    }
  }
})
