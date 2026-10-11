import Link from "next/link"
import type { Metadata } from "next"
import { getColumns, readingMinutes } from "@/lib/columns"
import { isAdmin } from "@/lib/admin"
import DraftButtons from "./_components/DraftButtons"
import { DRAFT_KINDS, OPINION_PLACEHOLDER, draftKindOf } from "@/lib/draftKinds"

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
  // 관리자에게만: 의견을 기다리는 AI 초안 전부를 맨 위에 모아 보여준다
  const pendingDrafts = admin ? columns.filter((c) => !c.published && c.content.includes(OPINION_PLACEHOLDER)) : []

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
          <h1 className="font-display uppercase text-2xl text-score-amber">칼럼</h1>
          {admin && (
            <div className="flex items-start gap-2">
            <DraftButtons />
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

        {pendingDrafts.length > 0 && (
          <section className="mb-6 p-4 border border-score-amber/50 bg-score-amber/10">
            <p className="text-sm font-semibold text-score-amber mb-3">
              ✍️ 한 줄 총평을 기다리는 초안 {pendingDrafts.length}개 — 총평만 쓰면 바로 발행돼요
            </p>
            <ul className="space-y-2">
              {pendingDrafts.map((d) => {
                const kind = draftKindOf(d.slug)
                return (
                  <li key={d.slug}>
                    <Link href={`/columns/write?slug=${d.slug}`} className="flex items-baseline gap-2 group">
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-score-amber/20 text-score-amber">
                        {kind ? DRAFT_KINDS[kind].label : "초안"}
                      </span>
                      <span className="text-xs text-floodlight/80 group-hover:text-score-amber line-clamp-1">{d.title}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
            <p className="text-[11px] text-floodlight/40 mt-3">경기 리포트 초안은 7일 안에 발행하지 않으면 자동으로 지워져요.</p>
          </section>
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
