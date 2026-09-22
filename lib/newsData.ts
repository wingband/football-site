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

// (2026-09-22) 크레딧 소진 등으로 호출 자체가 실패한 경우와, 정상 응답인데
// 매칭되는 기사가 진짜 0건인 경우를 화면에서 구분해서 보여주기 위한 플래그.
// limited가 true면 "일시적으로 불러올 수 없음" 같은 안내로, false인데 배열이
// 비어있으면 "관련 뉴스 없음"으로 다르게 렌더링한다.
export type NewsFetchResult = {
  articles: NewsArticle[]
  limited: boolean
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
): Promise<NewsFetchResult> {
  const cacheKey = `newsdata:${encodedQuery}:${category}:${size ?? "default"}`

  try {
    const articles = await getCachedOrFetch<NewsArticle[]>(cacheKey, NEWS_REVALIDATE, async () => {
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
    return { articles, limited: false }
  } catch (err) {
    devErrorOrSilent(`fetchNewsData 실패 (query=${encodedQuery}):`, err instanceof Error ? err.message : err)
    return { articles: [], limited: true }
  }
}
