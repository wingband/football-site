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
  { key: "report", bd: "border-score-amber/50", bg: "bg-score-amber/10", bar: "bg-score-amber", label: "경기 리포트", desc: "해외파 선수 경기별 평점과 활약", test: (b: string) => b === "경기 리포트" },
  { key: "club", bd: "border-violet-400/40", bg: "bg-violet-400/10", bar: "bg-violet-400", label: "유럽 빅클럽", desc: "맨유·맨시티·레알·바르사 등 빅클럽 경기 정리", test: (b: string) => b === "빅클럽" },
  { key: "kleague", bd: "border-sky-400/40", bg: "bg-sky-400/10", bar: "bg-sky-400", label: "K리그1", desc: "라운드 결과와 순위 정리", test: (b: string) => b === "K리그1" },
  { key: "abroad", bd: "border-emerald-400/40", bg: "bg-emerald-400/10", bar: "bg-emerald-400", label: "해외파 소식", desc: "주간 활약 정리와 주말 경기 일정", test: (b: string) => b.includes("해외파") },
  { key: "column", bd: "border-turf-line", bg: "bg-turf/40", bar: "bg-floodlight/50", label: "칼럼", desc: "GoalLine이 직접 쓰는 이야기", test: () => true },
] as const

export default async function ColumnsPage({ searchParams }: { searchParams: Promise<{ type?: string; page?: string; view?: string; q?: string }> }) {
  const { type, page, view, q } = await searchParams
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
        <ColumnList columns={columns} type={type} page={Number(page) || 1} views={views} view={view} q={(q ?? "").trim().slice(0, 40)} />
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

const PER_DATE_PAGE = 30 // 날짜순 보기: 페이지당 (한 줄 목록)

function kstKey(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })
}
function kstLabel(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short" })
}

function ColumnList({ columns: all, type, page, views, view, q }: { columns: ColumnItem[]; type?: string; page: number; views: Awaited<ReturnType<typeof getColumnViews>> | null; view?: string; q: string }) {
  // 검색: 제목·요약·태그에 검색어가 들어 있는 칼럼만 (여러 단어는 모두 포함)
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  const columns = words.length
    ? all.filter((c) => {
        const hay = `${c.title} ${c.summary} ${(c.tags ?? []).join(" ")}`.toLowerCase()
        return words.every((w) => hay.includes(w))
      })
    : all
  const dateMode = view === "date" || words.length > 0
  const mk = (o: { type?: string | null; view?: string | null; page?: number; q?: string }) => {
    const sp = new URLSearchParams()
    const t = o.type === undefined ? active : o.type
    if (t) sp.set("type", t)
    if (o.view) sp.set("view", o.view)
    const qq = o.q === undefined ? q : o.q
    if (qq) sp.set("q", qq)
    if (o.page && o.page > 1) sp.set("page", String(o.page))
    const str = sp.toString()
    return str ? `/columns?${str}` : "/columns"
  }
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

  const pageNav = (cur: number, pages: number, hrefOf: (n: number) => string) =>
    pages > 1 && (
      <nav className="flex flex-wrap items-center justify-center gap-1.5 pt-2" aria-label="페이지">
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <Link
            key={n}
            href={hrefOf(n)}
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
    )

  const viewBtn = (on: boolean) =>
    `text-sm px-3 py-1.5 border transition-colors ${on ? "bg-floodlight/10 text-floodlight border-floodlight/40 font-bold" : "border-turf-line text-floodlight/60 hover:text-floodlight"}`

  // 날짜순 보기: 날짜 제목 아래 한 줄 목록 (오래된 글까지 빠르게 훑기)
  const dateList = () => {
    const list = (active ? columns.filter((c) => groupOf(c).key === active) : columns)
      .slice()
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    if (list.length === 0) return <p className="text-sm text-floodlight/60 py-12 text-center">{words.length ? `"${q}"에 맞는 칼럼이 없어요.` : "칼럼이 없어요."}</p>
    const pages = Math.max(1, Math.ceil(list.length / PER_DATE_PAGE))
    const cur = Math.min(Math.max(1, page), pages)
    const slice = list.slice((cur - 1) * PER_DATE_PAGE, cur * PER_DATE_PAGE)
    const days: { key: string; label: string; items: ColumnItem[] }[] = []
    for (const c of slice) {
      const k = kstKey(c.createdAt)
      const last = days[days.length - 1]
      if (last && last.key === k) last.items.push(c)
      else days.push({ key: k, label: kstLabel(c.createdAt), items: [c] })
    }
    return (
      <>
        {words.length > 0 && <p className="text-sm text-floodlight/65">"{q}" 검색 결과 {list.length}개</p>}
        <div className="space-y-6">
          {days.map((d) => (
            <section key={d.key}>
              <h2 className="text-sm font-bold text-score-amber mb-1">{d.label}</h2>
              <ul className="divide-y divide-turf-line/40 border-t border-turf-line/40">
                {d.items.map((c) => {
                  const info = columnCardInfo(c)
                  const g = groupOf(c)
                  const v = views && c.published ? views.get(c.slug) : null
                  return (
                    <li key={c.slug}>
                      <Link href={`/columns/${c.slug}`} className="group flex items-baseline gap-3 py-3">
                        <span className="shrink-0 inline-flex items-center gap-1.5 text-xs text-floodlight/70 w-24">
                          <span aria-hidden className={`w-1.5 h-3.5 ${g.bar}`} />
                          {g.key === "column" ? "칼럼" : g.label}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-floodlight group-hover:text-score-amber transition-colors break-keep">
                            {info.title}
                            {info.rating != null && <span className="ml-2 text-xs font-data text-score-amber">평점 {info.rating}</span>}
                          </span>
                          {info.lead && <span className="hidden sm:block text-sm text-floodlight/55 line-clamp-1 mt-0.5">{info.lead}</span>}
                        </span>
                        {v && <span className="shrink-0 text-xs text-score-amber font-data">조회 {v.total}</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
        {pageNav(cur, pages, (n) => mk({ view: "date", page: n }))}
      </>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <form action="/columns" method="get" className="flex-1 min-w-[14rem] max-w-md flex items-center gap-2" role="search">
          <input type="hidden" name="view" value="date" />
          {active && <input type="hidden" name="type" value={active} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="팀·선수·키워드로 칼럼 찾기 (예: 아스날)"
            className="w-full bg-turf/40 border border-turf-line px-3 py-2 text-sm text-floodlight placeholder:text-floodlight/40 focus:outline-none focus:border-score-amber"
          />
          <button type="submit" className="shrink-0 text-sm px-3 py-2 bg-score-amber text-pitch-night font-bold hover:bg-floodlight transition-colors">검색</button>
        </form>
        <div className="flex">
          <Link href={mk({ view: null, q: "" })} className={viewBtn(!dateMode)}>종류별</Link>
          <Link href={mk({ view: "date" })} className={viewBtn(dateMode)}>날짜순</Link>
        </div>
      </div>

      <nav className="flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <Link
            key={t.key ?? "all"}
            href={mk({ type: t.key, view: dateMode ? "date" : null })}
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

      {dateMode ? (
        dateList()
      ) : active ? (
        (() => {
          const list = columns.filter((c) => groupOf(c).key === active)
          const pages = Math.max(1, Math.ceil(list.length / PER_PAGE))
          const cur = Math.min(Math.max(1, page), pages)
          return (
            <>
              <div className={grid}>{list.slice((cur - 1) * PER_PAGE, cur * PER_PAGE).map(card)}</div>
              {pageNav(cur, pages, (n) => mk({ page: n }))}
            </>
          )
        })()
      ) : (
        GROUPS.filter((g) => counts.has(g.key)).map((g) => {
          const list = columns.filter((c) => groupOf(c).key === g.key)
          return (
            <section key={g.key} className="pt-4 first:pt-0">
              <div className="flex items-center gap-3 mb-4">
                <span aria-hidden className={`w-1.5 h-6 ${g.bar}`} />
                <h2 className="text-lg font-bold text-floodlight shrink-0">{g.label}</h2>
                <span className="text-sm text-floodlight/65 truncate hidden sm:inline">{g.desc}</span>
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
