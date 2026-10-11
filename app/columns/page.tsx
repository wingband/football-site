import Link from "next/link"
import type { Metadata } from "next"
import { getColumns } from "@/lib/columns"
import ColumnCard from "@/components/ColumnCard"
import { isAdmin } from "@/lib/admin"
import DraftButtons from "./_components/DraftButtons"
import { getColumnViews } from "@/lib/columnViews"
import { DRAFT_KINDS, OPINION_PLACEHOLDER, draftKindOf } from "@/lib/draftKinds"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "칼럼",
  description: "GoalLine이 직접 쓰는 축구 칼럼. 한국인 해외파 활약 정리, 경기 분석, 리그 판도까지 데이터와 함께 짚어봅니다.",
  alternates: { canonical: "/columns" },
}

export default async function ColumnsPage() {
  const admin = await isAdmin()
  const columns = await getColumns({ includeDrafts: admin })
  // 칼럼별 조회수 — 관리자에게만
  const views = admin ? await getColumnViews() : null
  // 관리자에게만: 의견을 기다리는 AI 초안 전부를 맨 위에 모아 보여준다
  const pendingDrafts = admin ? columns.filter((c) => !c.published && c.content.includes(OPINION_PLACEHOLDER)) : []

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-floodlight">
      <section className="bg-turf/40 border border-turf-line/60 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-floodlight">GoalLine 칼럼</h1>
            <p className="text-sm sm:text-base text-floodlight/75 mt-2">
              데이터만으로는 보이지 않는 이야기. 해외파 활약, 경기 흐름, 리그 판도를 직접 짚어봅니다.
            </p>
          </div>
          {admin && (
            <div className="flex items-start gap-2">
              <DraftButtons />
              <Link
                href="/columns/write"
                className="text-sm px-4 py-2 bg-score-amber text-pitch-night font-bold rounded-full hover:bg-floodlight transition-colors"
              >
                새 칼럼 쓰기
              </Link>
            </div>
          )}
        </div>
      </section>

      {pendingDrafts.length > 0 && (
        <section className="p-4 rounded-2xl border border-score-amber/50 bg-score-amber/10">
          <p className="text-sm font-semibold text-score-amber mb-3">
            ✍️ 한 줄 총평을 기다리는 초안 {pendingDrafts.length}개 — 총평만 쓰면 바로 발행돼요
          </p>
          <ul className="space-y-2">
            {pendingDrafts.map((d) => {
              const kind = draftKindOf(d.slug)
              return (
                <li key={d.slug}>
                  <Link href={`/columns/write?slug=${d.slug}`} className="flex items-baseline gap-2 group">
                    <span className="shrink-0 text-[11px] px-1.5 py-0.5 rounded bg-score-amber/20 text-score-amber">
                      {kind ? DRAFT_KINDS[kind].label : "초안"}
                    </span>
                    <span className="text-sm text-floodlight/85 group-hover:text-score-amber line-clamp-1">{d.title}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
          <p className="text-xs text-floodlight/60 mt-3">
            경기 리포트 초안은 7일 안에 발행하지 않으면 자동으로 지워져요. 선수 이름 표기가 틀렸으면{" "}
            <Link href="/columns/names" className="underline hover:text-floodlight">이름 표기 고치기</Link>
          </p>
        </section>
      )}

      {columns.length === 0 ? (
        <p className="text-sm text-floodlight/60 py-16 text-center">아직 등록된 칼럼이 없습니다.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {columns.map((c) => (
            <ColumnCard
              key={c.slug}
              column={c}
              extra={
                views && c.published ? (
                  <span className="text-score-amber"> · 조회 {views.get(c.slug)?.total ?? 0} (오늘 {views.get(c.slug)?.today ?? 0})</span>
                ) : null
              }
            />
          ))}
        </div>
      )}
    </main>
  )
}
