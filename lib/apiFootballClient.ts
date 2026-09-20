// API-Football 호출의 유일한 저수준 진입점.
// (2026-09-20) 이 로직이 lib/matchApi.ts(apiFetch), lib/leagueData.ts(apiFootballFetch),
// app/matches/page.tsx(fetchFixturesFromApi)에 각자 조금씩 다르게 흩어져 있어서,
// 하루 동안 실패 패턴(429, 200+errors, 타임아웃)을 발견할 때마다 한 곳만 고치고
// 나머지는 예전 버그가 그대로 남는 일이 반복됐다. 앞으로는 이 파일 하나만 고치면
// 전체에 적용되도록 통합한다.
//
// 원칙: 실패는 반드시 throw한다 (호출부의 DB 캐시가 실패를 "성공"으로 착각해서
// 영구 저장하는 걸 막기 위해 — 절대 여기서 []나 null로 조용히 삼키지 않는다).
// 실패 종류: HTTP 비정상 상태코드 / API-Football이 200과 함께 주는 errors 필드
// (레이트리밋, 플랜 초과, 잘못된 파라미터 등) / response가 배열이어야 하는데 아닌 경우.

export class ApiFootballError extends Error {
  constructor(message: string, public readonly path: string) {
    super(message)
    this.name = "ApiFootballError"
  }
}

const TIMEOUT_MS = 8000
const RETRY_DELAY_MS = 800

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function hasApiErrors(data: { errors?: unknown }): boolean {
  const e = data?.errors
  if (!e) return false
  if (Array.isArray(e)) return e.length > 0
  if (typeof e === "object") return Object.keys(e as object).length > 0
  return true
}

export type FetchApiFootballOptions = {
  revalidate?: number
  tags?: string[]
  retries?: number // 최초 시도 포함 총 시도 횟수. 기본 2 (1회 재시도)
}

// 공용 내부 로직: HTTP 상태/타임아웃/재시도/errors 필드 검증까지 처리한 뒤 response
// 필드를 그대로 반환한다. expectArray가 true면(기본, 대부분의 엔드포인트) 배열이
// 아닐 때 에러를 던진다. (2026-09-20) /teams/statistics처럼 response가 배열이 아니라
// 객체 하나로 오는 예외적인 엔드포인트가 있다는 걸 확인해서, 그 경우만 이 검증을
// 생략할 수 있게 분리했다 — errors 체크/재시도/타임아웃은 두 경우 모두 동일하다.
async function fetchApiFootballInternal(
  path: string,
  { revalidate = 60, tags, retries = 2 }: FetchApiFootballOptions,
  expectArray: boolean
): Promise<unknown> {
  let lastErr: unknown

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetchWithTimeout(`https://v3.football.api-sports.io${path}`, {
        headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
        next: tags ? { revalidate, tags } : { revalidate },
      })

      if (!res.ok) {
        throw new ApiFootballError(`HTTP 응답 오류 (${res.status})`, path)
      }

      const data = await res.json()

      if (hasApiErrors(data)) {
        throw new ApiFootballError(`API-Football 에러: ${JSON.stringify(data.errors)}`, path)
      }

      if (expectArray && !Array.isArray(data.response)) {
        throw new ApiFootballError("응답이 배열이 아님", path)
      }

      return data.response
    } catch (err) {
      lastErr = err
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      }
    }
  }

  throw lastErr instanceof Error ? lastErr : new ApiFootballError(String(lastErr), path)
}

// 성공 시 항상 배열(API-Football의 response 필드는 대부분의 엔드포인트에서 배열)을
// 반환하고, 실패하면 ApiFootballError를 던진다. 순간적 흐림(레이트리밋/타임아웃)에
// 대비해 800ms 후 한 번 자동 재시도한다.
export async function fetchApiFootball(
  path: string,
  options: FetchApiFootballOptions = {}
): Promise<unknown[]> {
  return (await fetchApiFootballInternal(path, options, true)) as unknown[]
}

// /teams/statistics처럼 response가 배열이 아니라 객체 하나로 오는 예외적인
// 엔드포인트 전용. errors 체크/재시도/타임아웃 로직은 fetchApiFootball과 완전히
// 동일하고, "response는 배열이어야 한다"는 검증만 생략한다.
export async function fetchApiFootballRaw(
  path: string,
  options: FetchApiFootballOptions = {}
): Promise<unknown> {
  return fetchApiFootballInternal(path, options, false)
}
