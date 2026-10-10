import Link from "next/link"
import type { Metadata } from "next"
import { getColumns, readingMinutes } from "@/lib/columns"
import { isAdmin } from "@/lib/admin"
import WeeklyDraftButton from "./_components/WeeklyDraftButton"
import { OPINION_PLACEHOLDER } from "@/lib/generateWeeklyColumn"

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
  // 관리자에게만: 의견을 기다리는 AI 초안이 있으면 맨 위에 바로가기를 띄운다
  const pendingDraft = admin ? columns.find((c) => !c.published && c.content.includes(OPINION_PLACEHOLDER)) : undefined

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
          <h1 className="font-display uppercase text-2xl text-score-amber">칼럼</h1>
          {admin && (
            <div className="flex items-start gap-2">
            <WeeklyDraftButton />
            <Link
              href="/columns/write"
              className="text-sm px-4 py-2 bg-score-amber text-pitch-night font-bold rounded hover:bg-score-amber/80 transition-colors"
            >
              새 칼럼 쓰기
            </Link>
            </div>
          )}
        </div>
        <p className="text-sm text-floodlight/50 mb-8">
          데이터만으로는 보이지 않는 이야기. 해외파 활약, 경기 흐름, 리그 판도를 직접 짚어봅니다.
        </p>

        {pendingDraft && (
          <Link
            href={`/columns/write?slug=${pendingDraft.slug}`}
            className="block mb-6 p-4 border border-score-amber/50 bg-score-amber/10 hover:bg-score-amber/15 transition-colors"
          >
            <p className="text-sm font-semibold text-score-amber">✍️ 이번 주 초안이 준비됐어요 — 한 줄 의견 달고 발행하기 →</p>
            <p className="text-xs text-floodlight/60 mt-1 line-clamp-1">{pendingDraft.title}</p>
          </Link>
        )}

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
