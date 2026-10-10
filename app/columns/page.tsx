import Link from "next/link"
import type { Metadata } from "next"
import { getColumns, readingMinutes } from "@/lib/columns"
import { isAdmin } from "@/lib/admin"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "칼럼",
  description: "GoalLine이 직접 쓰는 축구 칼럼. 한국인 해외파 활약 정리, 경기 분석, 리그 판도까지 데이터와 함께 짚어봅니다.",
  alternates: { canonical: "/columns" },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default async function ColumnsPage() {
  const admin = await isAdmin()
  const columns = await getColumns({ includeDrafts: admin })

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-16">
        <div className="flex items-end justify-between gap-4 mb-2">
          <h1 className="font-display uppercase text-2xl text-score-amber">칼럼</h1>
          {admin && (
            <Link
              href="/columns/write"
              className="text-sm px-4 py-2 bg-score-amber text-pitch-night font-bold rounded hover:bg-score-amber/80 transition-colors"
            >
              새 칼럼 쓰기
            </Link>
          )}
        </div>
        <p className="text-sm text-floodlight/50 mb-8">
          데이터만으로는 보이지 않는 이야기. 해외파 활약, 경기 흐름, 리그 판도를 직접 짚어봅니다.
        </p>

        {columns.length === 0 ? (
          <p className="text-sm text-floodlight/40 py-16 text-center">아직 등록된 칼럼이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-turf-line/40 border-y border-turf-line/40">
            {columns.map((c) => (
              <li key={c.slug}>
                <Link href={`/columns/${c.slug}`} className="block py-5 group">
                  <div className="flex items-center gap-2 mb-1.5">
                    {!c.published && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-floodlight/10 text-floodlight/60">비공개</span>
                    )}
                    {c.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-[11px] text-score-amber/80">#{t}</span>
                    ))}
                  </div>
                  <h2 className="text-base font-semibold text-floodlight group-hover:text-score-amber transition-colors">
                    {c.title}
                  </h2>
                  {c.summary && <p className="text-sm text-floodlight/60 mt-1.5 line-clamp-2">{c.summary}</p>}
                  <p className="text-[11px] text-floodlight/35 mt-2">
                    {formatDate(c.createdAt)} · {readingMinutes(c.content)}분 읽기
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
