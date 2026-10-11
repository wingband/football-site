// API 호출 차단 게이트 (2026-10-11).
// 크롤러가 팀 → 선수단 → 선수 페이지를 하나씩 전부 훑으면서, 선수 한 명당 API를
// 8~9번(시즌 여러 개 + 프로필/이적/트로피/부상)씩 불러 하루 7만 콜(울트라 한도 7.5만)을
// 소진한 사고가 있었다 — 그날 실제 방문자는 11명.
// middleware.ts가 "봇이거나 사이트 안에서 이동해 온 요청이 아닌" 요청에 x-api-live: 0
// 헤더를 붙이면, 그 요청 안에서는 API를 새로 부르지 않고 DB에 저장된 값만 쓴다
// (getCachedOrFetch는 실패 시 오래된 캐시라도 돌려주고, 없으면 빈 화면).
// 크론·관리자 API처럼 요청 헤더가 없거나 읽을 수 없는 곳은 그대로 허용된다.

export class ApiGateBlockedError extends Error {
  constructor(path: string) {
    super(`API 게이트: 캐시 전용 요청이라 실시간 호출 생략 (${path})`)
    this.name = "ApiGateBlockedError"
  }
}

export async function isLiveApiAllowed(): Promise<boolean> {
  try {
    const { headers } = await import("next/headers")
    const h = await headers()
    return h.get("x-api-live") !== "0"
  } catch {
    // 요청 컨텍스트 밖(크론 내부 캐시 함수 등) — 막지 않는다
    return true
  }
}
