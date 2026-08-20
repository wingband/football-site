import type { Metadata } from "next"
import TeamHeader from "@/components/TeamHeader"
import { getTeamInfo, getTeamNews } from "@/lib/teamData"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const info = await getTeamInfo(id)
  if (!info) return { title: "팀 뉴스" }
  return { title: `${info.team.name} 뉴스`, description: `${info.team.name} 관련 최신 뉴스.` }
}

export default async function TeamNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const info = await getTeamInfo(id)
  if (!info) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
        <p className="text-floodlight/40">팀 정보를 찾을 수 없습니다.</p>
      </main>
    )
  }

  const news = await getTeamNews(info.team.name)
  const [hero, ...rest] = news

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-5xl mx-auto pb-16 px-4">
        <TeamHeader teamId={id} name={info.team.name} country={info.team.country} logo={info.team.logo} active="news" />

        {news.length === 0 && <p className="text-floodlight/40 text-sm py-6">관련 뉴스가 없습니다.</p>}

        {hero && (
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <a
              href={hero.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-turf/40 border border-turf-line/40 rounded-md overflow-hidden hover:bg-turf-line/20 transition-colors"
            >
              {hero.image_url && <img src={hero.image_url} alt="" className="w-full h-64 object-cover" />}
              <div className="p-5">
                <p className="text-lg font-medium leading-snug">{hero.title}</p>
                <p className="text-xs text-floodlight/40 mt-2">
                  {hero.source_name} · {new Date(hero.pubDate).toLocaleDateString("ko-KR")}
                </p>
              </div>
            </a>

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
                  {a.image_url && <img src={a.image_url} alt="" className="w-24 h-16 object-cover shrink-0 rounded" />}
                </a>
              ))}
            </div>
          </div>
        )}

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
                {a.image_url && <img src={a.image_url} alt="" className="w-24 h-16 object-cover shrink-0 rounded" />}
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
