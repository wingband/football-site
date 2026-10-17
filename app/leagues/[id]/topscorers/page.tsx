import Link from "next/link"
import type { Metadata } from "next"
import PlayerAvatar from "@/components/PlayerAvatar"
import Logo from "@/components/Logo"
import { getSeasonYear } from "@/lib/season"
import { getLeagueStandings, getLeagueTopAssists, getLeagueTopCards, getLeagueTopScorers, type ScorerEntry } from "@/lib/leagueData"

// (2026-10-17) "득점 순위" → "선수 순위": 득점 · 도움 · 공격포인트 · 경고 · 퇴장을 탭으로 바꿔 본다.
// 각 순위는 API-Football의 리그 순위 엔드포인트(상위 20명)를 쓰고, 공격포인트는 득점·도움 목록을 합쳐 계산한다.

const CATS = [
  { key: "goals", label: "득점" },
  { key: "assists", label: "도움" },
  { key: "ga", label: "공격포인트" },
  { key: "yellow", label: "경고" },
  { key: "red", label: "퇴장" },
] as const
type Cat = (typeof CATS)[number]["key"]

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return { alternates: { canonical: `/leagues/${id}/topscorers` }, title: "선수 순위 · 득점 · 도움 · 공격포인트" }
}

type Row = { id: number; name: string; photo: string; teamName: string; teamLogo: string; main: number; sub: string; apps: number | null }

const st = (s: ScorerEntry) => s.statistics[0]

function rowsFor(cat: Cat, scorers: ScorerEntry[], assists: ScorerEntry[], yellow: ScorerEntry[], red: ScorerEntry[]): Row[] {
  const base = (s: ScorerEntry) => ({
    id: s.player.id,
    name: s.player.name,
    photo: s.player.photo,
    teamName: st(s)?.team.name ?? "",
    teamLogo: st(s)?.team.logo ?? "",
    apps: st(s)?.games.appearences ?? null,
  })
  const g = (s: ScorerEntry) => st(s)?.goals.total ?? 0
  const a = (s: ScorerEntry) => st(s)?.goals.assists ?? 0
  const y = (s: ScorerEntry) => st(s)?.cards?.yellow ?? 0
  const r = (s: ScorerEntry) => (st(s)?.cards?.red ?? 0) + (st(s)?.cards?.yellowred ?? 0)
  const sortBy = (list: ScorerEntry[], f: (s: ScorerEntry) => number, tie: (s: ScorerEntry) => number) =>
    [...list].filter((s) => st(s)).sort((p, q) => f(q) - f(p) || tie(q) - tie(p))

  switch (cat) {
    case "goals":
      return sortBy(scorers, g, a).map((s) => ({ ...base(s), main: g(s), sub: `도움 ${a(s)}` }))
    case "assists":
      return sortBy(assists, a, g).map((s) => ({ ...base(s), main: a(s), sub: `득점 ${g(s)}` }))
    case "ga": {
      const pool = new Map<number, ScorerEntry>()
      for (const s of [...scorers, ...assists]) pool.set(s.player.id, s)
      return sortBy([...pool.values()], (s) => g(s) + a(s), g)
        .slice(0, 20)
        .map((s) => ({ ...base(s), main: g(s) + a(s), sub: `${g(s)}골 ${a(s)}도움` }))
    }
    case "yellow":
      return sortBy(yellow, y, r).map((s) => ({ ...base(s), main: y(s), sub: r(s) ? `퇴장 ${r(s)}` : "" }))
    case "red":
      return sortBy(red, r, y).map((s) => ({ ...base(s), main: r(s), sub: `경고 ${y(s)}` }))
  }
}

export default async function LeaguePlayerRankPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ season?: string; cat?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const cat: Cat = (CATS.find((c) => c.key === sp.cat)?.key ?? "goals") as Cat

  // 시즌: 주소의 ?season → 유럽식 시즌 → 달력 연도(K리그·MLS) 순으로 데이터가 있는 쪽
  let season = sp.season ? Number(sp.season) : getSeasonYear("England")
  if (!sp.season) {
    const data = await getLeagueStandings(id, season)
    if (!data) season = new Date().getFullYear()
  }

  const needGoals = cat === "goals" || cat === "ga" || cat === "assists"
  const [scorers, assists, yellow, red] = await Promise.all([
    needGoals && cat !== "assists" ? getLeagueTopScorers(id, season) : Promise.resolve([] as ScorerEntry[]),
    cat === "assists" || cat === "ga" ? getLeagueTopAssists(id, season) : Promise.resolve([] as ScorerEntry[]),
    cat === "yellow" ? getLeagueTopCards(id, season, "yellow") : Promise.resolve([] as ScorerEntry[]),
    cat === "red" ? getLeagueTopCards(id, season, "red") : Promise.resolve([] as ScorerEntry[]),
  ])
  const rows = rowsFor(cat, scorers, assists, yellow, red)
  const label = CATS.find((c) => c.key === cat)!.label
  const href = (c: Cat) => `/leagues/${id}/topscorers?cat=${c}${sp.season ? `&season=${sp.season}` : ""}`

  return (
    <>
      <nav className="flex flex-wrap gap-1.5 mb-4" aria-label="순위 종류">
        {CATS.map((c) => (
          <Link
            key={c.key}
            href={href(c.key)}
            prefetch={false}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              c.key === cat ? "bg-score-amber text-pitch-night font-bold" : "bg-turf-line/40 text-floodlight/70 hover:text-floodlight"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="text-floodlight/50 text-sm py-6">{label} 순위 데이터를 찾을 수 없습니다.</p>
      ) : (
        <div className="border-t border-turf-line/40">
          <div className="flex items-center gap-3 px-4 py-2 text-[11px] text-floodlight/45">
            <span className="w-6 text-center">#</span>
            <span className="flex-1">선수</span>
            <span className="hidden sm:block w-14 text-right">출전</span>
            <span className="w-20 text-right">{label}</span>
          </div>
          {rows.map((r, i) => {
            const rank = i > 0 && rows[i - 1].main === r.main ? null : i + 1
            return (
              <Link
                key={r.id}
                href={`/players/${r.id}`}
                prefetch={false}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-turf-line/30 border-b border-turf-line/30 ${i < 3 ? "bg-score-amber/[0.04]" : ""}`}
              >
                <span className={`w-6 text-center font-data shrink-0 ${i < 3 ? "text-score-amber font-bold" : "text-floodlight/45 text-sm"}`}>{rank ?? ""}</span>
                <PlayerAvatar src={r.photo} alt={r.name} className="w-9 h-9 rounded-full bg-turf-line object-cover shrink-0 text-xs" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Logo src={r.teamLogo} alt="" className="w-3.5 h-3.5" />
                    <span className="text-xs text-floodlight/50 truncate">{r.teamName}</span>
                  </div>
                </div>
                <span className="hidden sm:block w-14 text-right text-xs text-floodlight/50 font-data shrink-0">{r.apps ?? "-"}경기</span>
                <div className="w-20 text-right shrink-0 leading-tight">
                  <p className={`font-data font-bold text-lg ${cat === "red" ? "text-red-400" : cat === "yellow" ? "text-yellow-300" : "text-score-amber"}`}>{r.main}</p>
                  {r.sub && <p className="text-[11px] text-floodlight/45">{r.sub}</p>}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
