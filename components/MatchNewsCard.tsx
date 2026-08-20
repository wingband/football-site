type NewsArticle = {
  title: string
  link: string
  image_url: string | null
  pubDate: string
  source_name: string
}

export default function MatchNewsCard({ articles }: { articles: NewsArticle[] }) {
  if (articles.length === 0) {
    return <p className="text-floodlight/40 text-sm py-2">관련 뉴스가 없습니다.</p>
  }

  return (
    <div className="space-y-4">
      {articles.slice(0, 3).map((a, i) => (
        <a
          key={i}
          href={a.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex gap-3 items-start hover:bg-turf-line/20 transition-colors p-1 -m-1"
        >
          {a.image_url && (
            <img src={a.image_url} alt="" className="w-20 h-14 object-cover shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm text-floodlight/90 leading-snug line-clamp-2">{a.title}</p>
            <p className="text-xs text-floodlight/40 mt-1">
              {a.source_name} · {new Date(a.pubDate).toLocaleDateString("ko-KR")}
            </p>
          </div>
        </a>
      ))}
    </div>
  )
}
