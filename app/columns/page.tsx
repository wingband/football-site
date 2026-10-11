import Link from "next/link"
import type { Metadata } from "next"
import { getColumns } from "@/lib/columns"
import ColumnCard from "@/components/ColumnCard"
import { isAdmin } from "@/lib/admin"
import DraftButtons from "./_components/DraftButtons"
import { columnCardInfo } from "@/lib/columnCard"
import { getColumnViews } from "@/lib/columnViews"
import { DRAFT_KINDS, OPINION_PLACEHOLDER, draftKindOf } from "@/lib/draftKinds"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "칼럼",
  description: "GoalLine이 직접 쓰는 축구 칼럼. 한국인 해외파 활약 정리, 경기 분석, 리그 판도까지 데이터와 함께 짚어봅니다.",
  alternates: { canonical: "/columns" },
}

// 칼럼 종류 — 말머리([경기 리포트] 등)로 나눈다. 순서가 곧 탭·섹션 순서.
const GROUPS = [
  { key: "report", label: "경기 리포트", desc: "해외파 선수 경기별 평점과 활약", test: (b: string) => b === "경기 리포트" },
  { key: "kleague", label: "K리그1", desc: "라운드 결과와 순위 정리", test: (b: string) => b === "K리그1" },
  { key: "abroad", label: "해외파 소식", desc: "주간 활약 정리와 주말 경기 일정", test: (b: string) => b.includes("해외파") },
  { key: "column", label: "칼럼", desc: "GoalLine이 직접 쓰는 이야기", test: () => true },
] as const

export default async function ColumnsPage({ searchParams }: { searchParams: Promise<{ type?: string; page?: string }> }) {
  const { type, page } = await searchParams
  const admin = await isAdmin()
  const columns = await getColumns({ includeDrafts: admin })
  // 칼럼별 조회수 — 관리자에게만
  const views = admin ? await getColumnViews() : null
  // 관리자에게만: 의견을 기다리는 AI 초안 전부를 맨 위에 모아 보여준다
  const pendingDrafts = admin ? columns.filter((c) => !c.published && c.content.includes(OPINION_PLACEHOLDER)) : []

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-floodlight">
      <section className="bg-turf/40 border border-turf-line/60 rounded-none p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
 <h1 className="text-xl font-bold text-floodlight">GoalLine 칼럼</h1>
            <p className="text-sm text-floodlight/75 mt-2">
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
        <section className="p-4 rounded-none border border-score-amber/50 bg-score-amber/10">
          <p className="text-sm font-semibold text-score-amber mb-3">
            ✍️ 한 줄 총평을 기다리는 초안 {pendingDrafts.length}개 — 총평만 쓰면 바로 발행돼요
          </p>
          <ul className="space-y-2">
            {pendingDrafts.map((d) => {
              const kind = draftKindOf(d.slug)
              return (
                <li key={d.slug}>
                  <Link href={`/columns/write?slug=${d.slug}`} className="flex items-baseline gap-2 group">
                    <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-score-amber/20 text-score-amber">
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
        <ColumnList columns={columns} type={type} page={Number(page) || 1} views={views} />
      )}
    </main>
  )
}

type ColumnItem = Awaited<ReturnType<typeof getColumns>>[number]

function groupOf(c: ColumnItem) {
  const badge = columnCardInfo(c).badge
  return GROUPS.find((g) => g.test(badge))!
}

const PER_SECTION = 3 // 전체 보기: 종류별 맨 위 한 줄만
const PER_PAGE = 12 // 종류별 보기: 페이지당

function ColumnList({ columns, type, page, views }: { columns: ColumnItem[]; type?: string; page: number; views: Awaited<ReturnType<typeof getColumnViews>> | null }) {
  const counts = new Map<string, number>()
  for (const c of columns) counts.set(groupOf(c).key, (counts.get(groupOf(c).key) ?? 0) + 1)
  const active = GROUPS.find((g) => g.key === type && counts.has(g.key))?.key ?? null
  const tabs = [{ key: null as string | null, label: "전체", n: columns.length }, ...GROUPS.filter((g) => counts.has(g.key)).map((g) => ({ key: g.key as string | null, label: g.label, n: counts.get(g.key)! }))]

  const card = (c: ColumnItem) => (
    <ColumnCard
      key={c.slug}
      column={c}
      extra={
        views && c.published ? (
          <span className="text-score-amber"> · 조회 {views.get(c.slug)?.total ?? 0} (오늘 {views.get(c.slug)?.today ?? 0})</span>
        ) : null
      }
    />
  )
  const grid = "grid gap-4 md:grid-cols-2 lg:grid-cols-3"

  return (
    <>
      <nav className="flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <Link
            key={t.key ?? "all"}
            href={t.key ? `/columns?type=${t.key}` : "/columns"}
            className={`shrink-0 text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
              t.key === active
                ? "bg-score-amber text-pitch-night border-score-amber font-bold"
                : "border-turf-line text-floodlight/80 hover:text-floodlight hover:border-floodlight/40"
            }`}
          >
            {t.label}
            <span className={`ml-1.5 font-data text-xs ${t.key === active ? "text-pitch-night/70" : "text-floodlight/50"}`}>{t.n}</span>
          </Link>
        ))}
      </nav>

      {active ? (
        (() => {
          const list = columns.filter((c) => groupOf(c).key === active)
          const pages = Math.max(1, Math.ceil(list.length / PER_PAGE))
          const cur = Math.min(Math.max(1, page), pages)
          const href = (n: number) => (n === 1 ? `/columns?type=${active}` : `/columns?type=${active}&page=${n}`)
          return (
            <>
              <div className={grid}>{list.slice((cur - 1) * PER_PAGE, cur * PER_PAGE).map(card)}</div>
              {pages > 1 && (
                <nav className="flex items-center justify-center gap-1.5 pt-2" aria-label="페이지">
                  {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                    <Link
                      key={n}
                      href={href(n)}
                      className={`min-w-9 text-center text-sm px-3 py-1.5 border transition-colors ${
                        n === cur
                          ? "bg-score-amber text-pitch-night border-score-amber font-bold"
                          : "border-turf-line text-floodlight/80 hover:text-floodlight hover:border-floodlight/40"
                      }`}
                    >
                      {n}
                    </Link>
                  ))}
                </nav>
              )}
            </>
          )
        })()
      ) : (
        GROUPS.filter((g) => counts.has(g.key)).map((g) => {
          const list = columns.filter((c) => groupOf(c).key === g.key)
          return (
            <section key={g.key}>
              <div className="flex items-baseline gap-2 mb-3">
                <h2 className="text-base font-semibold text-floodlight">{g.label}</h2>
                <span className="text-sm text-floodlight/65">{g.desc}</span>
                {list.length > PER_SECTION && (
                  <Link href={`/columns?type=${g.key}`} className="ml-auto text-sm text-score-amber hover:underline shrink-0">
                    더 보기 ({list.length}) →
                  </Link>
                )}
              </div>
              <div className={grid}>{list.slice(0, PER_SECTION).map(card)}</div>
            </section>
          )
        })
      )}
    </>
  )
}
