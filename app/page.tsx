import Link from "next/link"
import type { Metadata } from "next"
import Logo from "@/components/Logo"
import PlayerAvatar from "@/components/PlayerAvatar"
import CoupangBanner from "@/components/CoupangBanner"
import LeagueHub from "@/components/LeagueHub"
import { BOARD_LEAGUES, getLeagueBoard, type LeagueBoardData } from "@/lib/leagueBoard"
import { getKoreanPlayersWeek, koTeam, type PlayerWeek } from "@/lib/koreanWeekly"
import { getPosts, type Post } from "@/lib/board"
import { boardCategoryLabel } from "@/lib/boardCategories"
import { getColumns, type Column } from "@/lib/columns"
import { draftKindOf, OPINION_PLACEHOLDER } from "@/lib/draftKinds"
import { getHomeResults, type HomeResult } from "@/lib/homeFixtures"
import { matchLinkHref } from "@/lib/slug"
import { KOREAN_PLAYERS_ABROAD } from "@/lib/koreanPlayersAbroad"

// 메인 화면 (2026-10-11 개편). 예전엔 / → /matches 영구 이동이었는데,
// "들어오자마자 할 게 없다"는 문제로 해외파 · 게시판 · 칼럼 · 결과 · K리그를 한 화면에 모았다.
// 되돌리려면 git 브랜치 backup/before-home-redesign 참고.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: { absolute: "GoalLine - 해외파 · 경기 결과 · 축구 칼럼 · 게시판" },
  description:
    "손흥민·이강인·김민재 등 해외파의 이번 주 경기와 평점, 주요 리그 경기 결과, K리그 순위, GoalLine 칼럼과 축구 게시판을 한 화면에서.",
  alternates: { canonical: "/" },
}

const CDN = "https://media.api-sports.io/football"
const KLEAGUE_LOGO = `${CDN}/leagues/292.png`
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"]

function kstParts(iso: string) {
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000)
  return {
    md: `${d.getUTCMonth() + 1}.${String(d.getUTCDate()).padStart(2, "0")}`,
    wd: WEEKDAY[d.getUTCDay()],
    hm: `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`,
  }
}

// 캘린더 파일(.ics) — 서버에서 만들어 링크에 실어 보내므로 별도 API가 필요 없다
function icsHref(title: string, iso: string) {
  const start = new Date(iso)
  const end = new Date(start.getTime() + 2 * 3600_000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GoalLine//KO",
    "BEGIN:VEVENT",
    `UID:${fmt(start)}-${encodeURIComponent(title)}@goalline.me`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${title}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${title}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`
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

// 칼럼 카드 왼쪽 동그라미에 넣을 그림과 짧은 꼬리표
function columnVisual(c: Column): { img: string | null; contain: boolean; tag: string } {
  const kind = draftKindOf(c.slug)
  if (kind === "report") {
    const m = c.slug.match(/match-report-(\d+)-\d+/)
    const pid = m ? Number(m[1]) : null
    const p = pid ? KOREAN_PLAYERS_ABROAD.find((x) => x.id === pid) : null
    const rating = c.title.match(/평점\s*([\d.]+)/)?.[1]
    return { img: pid ? playerPhoto(pid) : null, contain: false, tag: [p?.name, rating && `평점 ${rating}`].filter(Boolean).join(" · ") || "경기 리포트" }
  }
  if (kind === "kleague") {
    const round = c.title.match(/(\d+)\s*라운드/)?.[1]
    return { img: KLEAGUE_LOGO, contain: true, tag: round ? `K LEAGUE 1 · R${round}` : "K LEAGUE 1" }
  }
  if (kind === "weekly") return { img: null, contain: false, tag: "주간 해외파" }
  if (kind === "weekend") return { img: null, contain: false, tag: "주말 일정" }
  return { img: null, contain: false, tag: c.tags[0] ?? "칼럼" }
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

export default async function Home() {
  const [weeks, board, allColumns, results, leagueBoard] = await Promise.all([
    safe(getKoreanPlayersWeek(), [] as PlayerWeek[], "해외파"),
    safe(getPosts(null, 1, 4), { posts: [] as Post[], total: 0 }, "게시판"),
    safe(getColumns({ limit: 80 }), [] as Column[], "칼럼"),
    safe(getHomeResults(8), [] as HomeResult[], "경기 결과"),
    safe(getLeagueBoard(39), null as LeagueBoardData | null, "리그 순위"),
  ])

  const published = allColumns.filter((c) => c.published && !c.content.includes(OPINION_PLACEHOLDER))
  const columns = published.slice(0, 3)

  const upcoming = pickUpcoming(weeks)

  const recent = weeks
    .flatMap((w) => w.recent.filter((m) => m.played && m.rating !== null).map((m) => ({ w, m })))
    .sort((a, b) => (b.m.rating ?? 0) - (a.m.rating ?? 0))
    .slice(0, 3)


  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* 최근 경기 결과 */}
        <section className="bg-turf/40 border border-turf-line/60 rounded-2xl p-4 sm:p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h1 className="font-display text-xl text-floodlight">최근 경기 결과</h1>
            <Link href="/matches" className="text-xs text-floodlight/50 hover:text-score-amber">
              전체 경기 →
            </Link>
          </div>
          {results.length === 0 ? (
            <p className="text-sm text-floodlight/40 py-4">오늘·어제 끝난 주요 리그 경기가 없어요.</p>
          ) : (
            <ul className="divide-y divide-turf-line/40">
              {results.map((r) => (
                <li key={r.fixtureId}>
                  <Link href={matchLinkHref(r.slugSource)} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2.5 hover:bg-turf-line/20 rounded">
                    <span className="flex items-center justify-end gap-2 min-w-0 text-sm text-floodlight/90">
                      <span className="truncate">{r.home.name}</span>
                      <Logo src={r.home.logo} alt="" className="w-5 h-5 shrink-0" />
                    </span>
                    <span className="flex flex-col items-center min-w-16">
                      <span className="font-data font-semibold text-floodlight">
                        {r.homeScore ?? "-"} : {r.awayScore ?? "-"}
                      </span>
                      <span className={`text-[10px] ${r.live ? "text-red-400" : "text-floodlight/30"}`}>
                        {r.live ? "진행 중" : r.leagueName}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 min-w-0 text-sm text-floodlight/90">
                      <Logo src={r.away.logo} alt="" className="w-5 h-5 shrink-0" />
                      <span className="truncate">{r.away.name}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 오른쪽: 게시판 + 광고 */}
        <aside className="space-y-4">
          <section className="bg-turf/40 border border-turf-line/60 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <Link href="/board" className="font-display text-lg text-floodlight hover:text-score-amber">
                게시판
              </Link>
              <Link href="/board/write" className="text-xs px-3 py-1.5 bg-score-amber text-pitch-night font-bold rounded-full hover:bg-floodlight">
                글쓰기
              </Link>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                ["free", "자유"],
                ["abroad", "해외파"],
                ["epl", "프리미어리그"],
                ["kleague", "K리그"],
              ].map(([key, label]) => (
                <Link
                  key={key}
                  href={`/board?category=${key}`}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-turf-line text-floodlight/60 hover:text-floodlight hover:border-floodlight/40"
                >
                  {label}
                </Link>
              ))}
            </div>
            {board.posts.length === 0 ? (
              <p className="text-sm text-floodlight/40 py-3">아직 글이 없어요. 첫 글을 남겨보세요!</p>
            ) : (
              <ul className="divide-y divide-turf-line/40">
                {board.posts.map((p) => (
                  <li key={p.id}>
                    <Link href={`/board/${p.id}`} className="flex items-center gap-2 py-2 text-sm hover:text-score-amber">
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-turf-line/60 text-floodlight/60">
                        {boardCategoryLabel(p.category)}
                      </span>
                      <span className="truncate text-floodlight/90">{p.title}</span>
                      {p.commentCount > 0 && <span className="shrink-0 text-[11px] text-score-amber font-data">[{p.commentCount}]</span>}
                      <span className="ml-auto shrink-0 text-[11px] text-floodlight/30 font-data">{kstParts(p.createdAt).md}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <CoupangBanner />
        </aside>
      </div>

      {/* 리그 순위 · 득점 · 도움 */}
      <LeagueHub tabs={BOARD_LEAGUES.map((l) => ({ id: l.id, label: l.label }))} initial={leagueBoard} />

      {/* 이번 주 해외파 */}
      <section className="bg-turf/40 border border-turf-line/60 rounded-2xl p-4 sm:p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display text-xl text-floodlight">이번 주 해외파</h2>
          <Link href="/korean-players" className="text-xs text-floodlight/50 hover:text-score-amber">
            전체 보기 →
          </Link>
        </div>

        <h2 className="text-[11px] tracking-widest text-floodlight/40 font-data mb-2">다가오는 경기</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-floodlight/40 py-4">7일 안에 잡힌 해외파 경기가 없어요.</p>
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
                      <span className="text-floodlight/50"> · {next!.isHome ? "홈" : "원정"} vs {koTeam(next!.opponentName)}</span>
                    </p>
                    <p className="text-xs text-floodlight/40 font-data">
                      [{t.wd}] {t.md} {t.hm}
                    </p>
                  </div>
                  <a
                    href={icsHref(title, next!.date)}
                    download={`goalline-${player.id}-${next!.fixtureId}.ics`}
                    title="경기 30분 전 알림이 휴대폰·PC 캘린더에 저장됩니다"
                    className="shrink-0 text-[11px] px-2.5 py-1 rounded-full border border-turf-line text-floodlight/60 hover:border-score-amber hover:text-score-amber"
                  >
                    캘린더에 추가
                  </a>
                </li>
              )
            })}
          </ul>
        )}

        <h2 className="text-[11px] tracking-widest text-floodlight/40 font-data mt-5 mb-2">최근 활약 (평점순)</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-floodlight/40 py-4">최근 7일 동안 평점이 나온 경기가 없어요.</p>
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
                  className="group flex flex-col items-center text-center bg-pitch-night/60 border border-turf-line/50 rounded-xl px-2 py-3 hover:border-score-amber/60"
                >
                  <div className="relative">
                    <PlayerAvatar src={playerPhoto(w.player.id)} alt={w.player.name} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full ring-2 ring-score-amber/70" />
                    <span className={`absolute -bottom-1 -right-2 text-[11px] font-data font-bold px-1.5 rounded ${ratingTone(m.rating!)}`}>
                      {m.rating!.toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-floodlight truncate max-w-full">{w.player.name}</p>
                  <p className="text-[11px] text-floodlight/50 truncate max-w-full">
                    vs {koTeam(m.opponentName)} {score}
                  </p>
                  {(m.goals > 0 || m.assists > 0) && (
                    <p className="text-[11px] text-score-amber">
                      {m.goals > 0 && `${m.goals}골`} {m.assists > 0 && `${m.assists}도움`}
                    </p>
                  )}
                  <span className="mt-1 text-[11px] text-floodlight/40 group-hover:text-score-amber">
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
            <h2 className="font-display text-xl text-floodlight">GoalLine 칼럼</h2>
            <Link href="/columns" className="text-xs text-floodlight/50 hover:text-score-amber">
              전체 보기 →
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {columns.map((c) => {
              const v = columnVisual(c)
              return (
                <Link
                  key={c.slug}
                  href={`/columns/${c.slug}`}
                  className="flex md:flex-col items-center md:items-start gap-4 bg-turf/40 border border-turf-line/60 rounded-2xl p-4 hover:border-score-amber/60"
                >
                  <div className="shrink-0 w-[72px] h-[72px] md:w-[104px] md:h-[104px] rounded-full ring-2 ring-score-amber/70 overflow-hidden bg-pitch-night flex items-center justify-center">
                    {v.img ? (
                      v.contain ? (
                        <Logo src={v.img} alt="K리그1" className="w-3/5 h-3/5" />
                      ) : (
                        <PlayerAvatar src={v.img} alt={v.tag} className="w-full h-full" />
                      )
                    ) : (
                      <span className="font-display text-score-amber text-lg md:text-2xl">GL</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-score-amber font-data mb-1">{v.tag}</p>
                    <p className="text-sm md:text-base font-semibold text-floodlight line-clamp-2">{c.title}</p>
                    {c.summary && <p className="hidden md:block mt-1 text-xs text-floodlight/50 line-clamp-2">{c.summary}</p>}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}
