// NewsData.io 호출을 한 곳에 모은 공용 fetcher.
//
// (2026-09-21) 팀 뉴스(teamData.ts)/리그 뉴스(leagueData.ts)/경기 뉴스(matchApi.ts)/
// 뉴스 홈(app/news/page.tsx) 네 곳 모두 Postgres 캐시(getCachedOrFetch) 없이
// Next의 revalidate(1시간 이하)만으로 매번 라이브 호출하고 있었다. 방문자가 여러
// 팀/리그/경기 페이지를 돌아다닐 때마다 서로 다른 쿼리로 API가 계속 소진되는
// 구조였고, 이게 "You exceeded your assigned API credits"(ApiLimitExceeded)
// 사고의 핵심 원인이었다(계정이 Free 플랜이라 한도 자체도 낮음).
// getCachedOrFetch로 통합해 같은 쿼리는 캐시 기간 동안 API를 아예 안 부르게 한다.
// 뉴스는 실시간성이 중요하지 않으므로 6시간 캐시로 방어한다.
import { getCachedOrFetch } from "@/lib/apiCache"
import { devErrorOrSilent } from "@/lib/quietLog"

export type NewsArticle = {
  title: string
  link: string
  image_url: string | null
  pubDate: string
  source_name: string
  description: string | null
}

const NEWS_REVALIDATE = 21600 // 6시간

export type NewsDataOptions = {
  size?: number
  category?: string
}

// query는 호출부에서 이미 encodeURIComponent 처리된 문자열을 넘긴다 (기존 관례 유지).
// 캐시 키는 쿼리+size+category 조합으로 만들어서, 같은 검색어라도 옵션이 다르면
// 별도로 캐시된다.
export async function fetchNewsData(
  encodedQuery: string,
  { size, category = "sports" }: NewsDataOptions = {}
): Promise<NewsArticle[]> {
  const cacheKey = `newsdata:${encodedQuery}:${category}:${size ?? "default"}`

  try {
    return await getCachedOrFetch<NewsArticle[]>(cacheKey, NEWS_REVALIDATE, async () => {
      const sizeParam = size ? `&size=${size}` : ""
      const res = await fetch(
        `https://newsdata.io/api/1/news?apikey=${process.env.NEWSDATA_API_KEY}&q=${encodedQuery}&language=en&category=${category}${sizeParam}`,
        { next: { revalidate: NEWS_REVALIDATE } }
      )
      const data = await res.json()
      if (!Array.isArray(data.results)) {
        // NewsData.io는 API-Football과 다른 별도 서비스라 errors 필드 형태가 다르다.
        // 여기서 던져야 getCachedOrFetch가 "실패"로 인식해 캐시하지 않고,
        // 가능하면 오래된 캐시로 폴백한다 (완전히 새 쿼리라 폴백이 없으면 그냥 실패).
        throw new Error(`NewsData.io 에러: ${JSON.stringify(data)}`)
      }
      return data.results as NewsArticle[]
    })
  } catch (err) {
    devErrorOrSilent(`fetchNewsData 실패 (query=${encodedQuery}):`, err instanceof Error ? err.message : err)
    return []
  }
}
