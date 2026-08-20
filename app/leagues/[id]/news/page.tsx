import type { Metadata } from "next"
import { getSeasonYear } from "@/lib/season"
import { getLeagueStandings, getLeagueNews } from "@/lib/leagueData"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const euroSeason = getSeasonYear("England")
  let data = await getLeagueStandings(id, euroSeason)
  if (!data) data = await getLeagueStandings(id, new Date().getFullYear())

  if (!data) return { title: "리그 뉴스" }

  return {
    title: `${data.league.name} 뉴스`,
    description: `${data.league.name} 관련 최신 뉴스를 확인하세요.`,
  }
}

export default async function LeagueNewsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const euroSeason = getSeasonYear("England")
  let data = await getLeagueStandings(id, euroSeason)
  if (!data) data = await getLeagueStandings(id, new Date().getFullYear())

  if (!data) {
    return <p className="text-floodlight/40 pt-4">리그 정보를 찾을 수 없습니다.</p>
  }

  const { league } = data
  const news = await getLeagueNews(league.name)
  const [hero, ...rest] = news

  return (
    <>
{news.length === 0 && (
          <p className="text-floodlight/40 text-sm py-6">관련 뉴스가 없습니다.</p>
        )}

        {hero && (
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* 히어로 기사 */}
            <a
              href={hero.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-turf/40 border border-turf-line/40 rounded-md overflow-hidden hover:bg-turf-line/20 transition-colors"
            >
              {hero.image_url && (
                <img src={hero.image_url} alt="" className="w-full h-64 object-cover" />
              )}
              <div className="p-5">
                <p className="text-lg font-medium leading-snug">{hero.title}</p>
                <p className="text-xs text-floodlight/40 mt-2">
                  {hero.source_name} · {new Date(hero.pubDate).toLocaleDateString("ko-KR")}
                </p>
              </div>
            </a>

            {/* 우측 기사 리스트 */}
            <div className="divide-y divide-turf-line/30">
              {rest.slice(0, 4).map((a, i) => (
                <a
                  key={i}
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 items-start py-3 hover:bg-turf-line/20 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-floodlight/90 leading-snug line-clamp-2">{a.title}</p>
                    <p className="text-xs text-floodlight/40 mt-1">
                      {a.source_name} · {new Date(a.pubDate).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  {a.image_url && (
                    <img src={a.image_url} alt="" className="w-24 h-16 object-cover shrink-0 rounded" />
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 나머지 기사 그리드 */}
        {rest.length > 4 && (
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
            {rest.slice(4, 16).map((a, i) => (
              <a
                key={i}
                href={a.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 items-start hover:bg-turf-line/20 transition-colors p-1 -m-1"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-floodlight/90 leading-snug line-clamp-2">{a.title}</p>
                  <p className="text-xs text-floodlight/40 mt-1">
                    {a.source_name} · {new Date(a.pubDate).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                {a.image_url && (
                  <img src={a.image_url} alt="" className="w-24 h-16 object-cover shrink-0 rounded" />
                )}
              </a>
            ))}
          </div>
        )}
    </>
  )
}
