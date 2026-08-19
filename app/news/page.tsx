import type { Metadata } from "next"
import { MOCK_NEWS } from "@/lib/mockData"

type NewsArticle = {
  title: string
  link: string
  image_url: string | null
  pubDate: string
  source_name: string
  description: string | null
}

async function getFootballNews(): Promise<NewsArticle[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_NEWS

  const res = await fetch(
    `https://newsdata.io/api/1/news?apikey=${process.env.NEWSDATA_API_KEY}&q=football%20soccer&language=en&category=sports`,
    { next: { revalidate: 3600 } }
  )
  const data = await res.json()
  return data.results ?? []
}

export const metadata: Metadata = {
  title: "축구 뉴스",
  description: "전 세계 축구 관련 최신 뉴스를 한곳에서 확인하세요.",
}

export default async function NewsPage() {
  const articles = await getFootballNews()

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display uppercase text-xl text-score-amber mb-1">축구 뉴스</h1>
        <p className="text-xs text-floodlight/40 mb-8">전 세계 축구 관련 최신 소식</p>

        {articles.length === 0 && (
          <p className="text-floodlight/40 text-sm">뉴스를 불러올 수 없습니다.</p>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          {articles.map((a, i) => (

            <a
              key={i}
              href={a.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-turf/40 border-l-2 border-score-amber overflow-hidden hover:bg-turf-line/30 transition-colors"
            >
              {a.image_url && (
                <img src={a.image_url} alt="" className="w-full h-36 object-cover" />
              )}
              <div className="p-4">
                <p className="text-sm font-medium text-floodlight leading-snug line-clamp-2">
                  {a.title}
                </p>
                {a.description && (
                  <p className="text-xs text-floodlight/50 mt-2 line-clamp-2">{a.description}</p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] text-floodlight/30">{a.source_name}</span>
                  <span className="text-[11px] text-floodlight/30 font-data">
                    {new Date(a.pubDate).toLocaleDateString("ko-KR")}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}