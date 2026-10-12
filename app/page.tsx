import Link from "next/link"
import { unstable_cache } from "next/cache"
import type { Metadata } from "next"
import PlayerAvatar from "@/components/PlayerAvatar"
import CoupangBanner from "@/components/CoupangBanner"
import LeagueHub from "@/components/LeagueHub"
import { BOARD_LEAGUES, getLeagueBoard, type LeagueBoardData } from "@/lib/leagueBoard"
import { getKoreanPlayersWeek, koTeam, type PlayerWeek } from "@/lib/koreanWeekly"
import { getPosts, type Post } from "@/lib/board"
import HomeBoard from "@/components/HomeBoard"

const HOME_BOARD_TABS = [
  { key: "all", label: "전체" },
  { key: "free", label: "자유" },
  { key: "epl", label: "PL" },
  { key: "kleague", label: "K리그" },
  { key: "national", label: "국가대표" },
]
import { boardCategoryLabel } from "@/lib/boardCategories"
import { getColumns, type Column } from "@/lib/columns"
import { OPINION_PLACEHOLDER } from "@/lib/draftKinds"
import { getHomeResults, HOME_LEAGUE_TABS, type HomeResult } from "@/lib/homeFixtures"
import HomeResults from "@/components/HomeResults"
import AddToCalendar from "@/components/AddToCalendar"
import ColumnCard from "@/components/ColumnCard"

// 메인 화면 (2026-10-11 개편). 예전엔 / → /matches 영구 이동이었는데,
// "들어오자마자 할 게 없다"는 문제로 해외파 · 게시판 · 칼럼 · 결과 · K리그를 한 화면에 모았다.
// 되돌리려면 git 브랜치 backup/before-home-redesign 참고.
// 매 방문마다 데이터를 새로 모으면 DB를 여러 번 오가느라 2~6초가 걸렸다.
// 모은 결과를 1분간 서버에 보관해 두고(unstable_cache) 모든 방문자가 같이 쓴다.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: { absolute: "GoalLine - 해외파 · 경기 결과 · 축구 칼럼 · 게시판" },
  description:
    "손흥민·이강인·김민재 등 해외파의 이번 주 경기와 평점, 주요 리그 경기 결과, K리그 순위, GoalLine 칼럼과 축구 게시판을 한 화면에서.",
  alternates: { canonical: "/" },
}

const CDN = "https://media.api-sports.io/football"
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"]

function kstParts(iso: string) {
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000)
  return {
    md: `${d.getUTCMonth() + 1}.${String(d.getUTCDate()).padStart(2, "0")}`,
    wd: WEEKDAY[d.getUTCDay()],
    hm: `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`,
  }
}

const playerPhoto = (id: number) => `${CDN}/players/${id}.png`

function reportSlugFor(columns: Column[], playerId: number, fixtureId: number) {
  return columns.find((c) => c.slug.includes(`match-report-${playerId}-${fixtureId}`))?.slug ?? null
}

function ratingTone(r: number) {
  if (r >= 8) return "bg-score-amber text-pitch-night"
  if (r >= 7) return "bg-emerald-500 text-pitch-night"
  if (r >= 6) return "bg-turf-line text-floodlight"
  return "bg-red-500/80 text-floodlight"
}

// 7일 안에 열리는 해외파 경기, 가까운 순 4개
function pickUpcoming(weeks: PlayerWeek[]) {
  const now = Date.now()
  return weeks
    .filter((w) => w.next && new Date(w.next.date).getTime() > now && new Date(w.next.date).getTime() - now < 7 * 86400_000)
    .sort((a, b) => new Date(a.next!.date).getTime() - new Date(b.next!.date).getTime())
    .slice(0, 4)
}

async function safe<T>(p: Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await p
  } catch (err) {
    console.error(`메인: ${label} 실패:`, err instanceof Error ? err.message : err)
    return fallback
  }
}

const getHomeData = unstable_cache(
  async () => {
    const [weeks, board, allColumns, results, leagueBoard] = await Promise.all([
      safe(getKoreanPlayersWeek(), [] as PlayerWeek[], "해외파"),
      safe(Promise.all(HOME_BOARD_TABS.map((t) => getPosts(t.key === "all" ? null : t.key, 1, 7))), [] as { posts: Post[]; total: number }[], "게시판"),
      safe(getColumns({ limit: 80 }), [] as Column[], "칼럼"),
      safe(getHomeResults(60), [] as HomeResult[], "경기 결과"),
      safe(getLeagueBoard(39), null as LeagueBoardData | null, "리그 순위"),
    ])
    return { weeks, board, allColumns, results, leagueBoard }
  },
  ["home-data-v1"],
  { revalidate: 60 }
)

export default async function Home() {
  const { weeks, board, allColumns, results, leagueBoard } = await getHomeData()

  const published = allColumns.filter((c) => c.published && !c.content.includes(OPINION_PLACEHOLDER))
  const columns = published.slice(0, 3)

  const upcoming = pickUpcoming(weeks)

  const recent = weeks
    .flatMap((w) => w.recent.filter((m) => m.played && m.rating !== null).map((m) => ({ w, m })))
    .sort((a, b) => (b.m.rating ?? 0) - (a.m.rating ?? 0))
    .slice(0, 3)


  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
        {/* 최근 경기 결과 — 리그 탭 · 날짜/시각 */}
        <HomeResults tabs={HOME_LEAGUE_TABS.map((t) => ({ id: t.id, label: t.label }))} results={results} />

        {/* 오른쪽: 게시판 + 광고 */}
        <aside className="space-y-4">
          <CoupangBanner />
          <section className="border-t border-turf-line/50 pt-4">
            <div className="flex items-center justify-between mb-3">
              <Link href="/board" className="text-base font-semibold text-floodlight hover:text-score-amber">
                게시판
              </Link>
              <Link href="/board/write" className="text-xs px-3 py-1.5 bg-score-amber text-pitch-night font-bold rounded-full hover:bg-floodlight">
                글쓰기
              </Link>
            </div>
            <HomeBoard
              tabs={HOME_BOARD_TABS.map((t, i) => ({
                key: t.key,
                label: t.label,
                posts: (board[i]?.posts ?? []).map((p) => ({
                  id: p.id,
                  label: boardCategoryLabel(p.category),
                  title: p.title,
                  commentCount: p.commentCount,
                  md: kstParts(p.createdAt).md,
                })),
              }))}
            />
          </section>

        </aside>
      </div>

      {/* 리그 순위 · 득점 · 도움 */}
      <LeagueHub tabs={BOARD_LEAGUES.map((l) => ({ id: l.id, label: l.label }))} initial={leagueBoard} />

      {/* 이번 주 해외파 */}
      <section className="border-t border-turf-line/50 pt-4">
        <div className="flex items-baseline justify-between mb-4">
 <h2 className="text-base font-semibold text-floodlight">이번 주 해외파</h2>
          <Link href="/korean-players" className="text-xs text-floodlight/75 hover:text-score-amber">
            전체 보기 →
          </Link>
        </div>

 <h3 className="text-sm font-semibold text-floodlight/90 mb-1">다가오는 경기</h3>
        <p className="text-xs text-floodlight/65 mb-2">한국 시간 기준 · 📅 버튼을 누르면 <b className="text-floodlight/90 font-semibold">내 캘린더 앱</b>에 경기 시간과 30분 전 알림이 저장돼요</p>
        {upcoming.length === 0 ? (
          <p className="text-sm text-floodlight/65 py-4">7일 안에 잡힌 해외파 경기가 없어요.</p>
        ) : (
          <ul className="divide-y divide-turf-line/40">
            {upcoming.map(({ player, next }) => {
              const t = kstParts(next!.date)
              const title = `${player.name} · ${koTeam(next!.homeName)} vs ${koTeam(next!.awayName)}`
              return (
                <li key={player.id} className="flex items-center gap-3 py-2.5">
                  <Link href={`/players/${player.id}`} className="shrink-0">
                    <PlayerAvatar src={playerPhoto(player.id)} alt={player.name} className="w-10 h-10 rounded-full ring-2 ring-score-amber/60" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-floodlight truncate">
                      <Link href={`/players/${player.id}`} className="font-semibold hover:text-score-amber">
                        {player.name}
                      </Link>
                      <span className="text-floodlight/75"> · {next!.isHome ? "홈" : "원정"} vs {koTeam(next!.opponentName)}</span>
                    </p>
                    <p className="text-xs text-floodlight/65 font-data">
                      [{t.wd}] {t.md} {t.hm}
                    </p>
                  </div>
                  <AddToCalendar title={title} startIso={next!.date} id={`${player.id}-${next!.fixtureId}`} />
                </li>
              )
            })}
          </ul>
        )}

 <h3 className="text-sm font-semibold text-floodlight/90 mt-6 mb-2">최근 활약 <span className="font-normal text-floodlight/65">· 평점 높은 순</span></h3>
        {recent.length === 0 ? (
          <p className="text-sm text-floodlight/65 py-4">최근 7일 동안 평점이 나온 경기가 없어요.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {recent.map(({ w, m }) => {
              const slug = reportSlugFor(published, w.player.id, m.fixtureId)
              const href = slug ? `/columns/${slug}` : `/players/${w.player.id}`
              const score = m.isHome ? `${m.homeScore}:${m.awayScore}` : `${m.awayScore}:${m.homeScore}`
              return (
                <Link
                  key={`${w.player.id}-${m.fixtureId}`}
                  href={href}
                  className="group flex flex-col items-center text-center bg-pitch-night/60 border border-turf-line/50 rounded-none px-2 py-3 hover:border-score-amber/60"
                >
                  <div className="relative">
                    <PlayerAvatar src={playerPhoto(w.player.id)} alt={w.player.name} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full ring-2 ring-score-amber/70" />
                    <span className={`absolute -bottom-1 -right-2 text-xs font-data font-bold px-1.5 rounded ${ratingTone(m.rating!)}`}>
                      {m.rating!.toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-floodlight truncate max-w-full">{w.player.name}</p>
                  <p className="text-xs text-floodlight/75 truncate max-w-full">
                    vs {koTeam(m.opponentName)} {score}
                  </p>
                  {(m.goals > 0 || m.assists > 0) && (
                    <p className="text-xs text-score-amber">
                      {m.goals > 0 && `${m.goals}골`} {m.assists > 0 && `${m.assists}도움`}
                    </p>
                  )}
                  <span className="mt-1.5 text-sm font-semibold text-score-amber">
                    {slug ? "리포트 보기 →" : "기록 보기 →"}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* GoalLine 칼럼 */}
      {columns.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
 <h2 className="text-base font-semibold text-floodlight">GoalLine 칼럼</h2>
            <Link href="/columns" className="text-xs text-floodlight/75 hover:text-score-amber">
              전체 보기 →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {columns.map((c) => (
              <ColumnCard key={c.slug} column={c} />
            ))}
          </div>
        </section>
      )}
      <h1 className="sr-only">GoalLine 해외파 경기 결과 · 축구 칼럼 · 게시판</h1>
    </main>
  )
}
