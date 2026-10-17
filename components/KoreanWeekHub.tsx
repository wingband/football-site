import { matchLinkHref } from "@/lib/slug"
import KoreanRecentRow, { type RecentRowData } from "@/components/KoreanRecentRow"
import UpcomingList, { type UpcomingRow } from "@/components/UpcomingList"
import { koTeam, koLeague, type PlayerWeek } from "@/lib/koreanWeekly"

// 해외파 허브: "이번 주 경기 일정" + "최근 7일 활약". /korean-players 상단에 들어간다.
// (2026-10-10) "손흥민 오늘 경기", "이강인 경기 일정" 같은 매일 반복되는 검색을
// 한 페이지에서 받기 위한 섹션 — 다른 사이트엔 이렇게 모아둔 곳이 없다.

const CARD = "border-t border-turf-line/50 pt-4"
const photo = (id: number) => `https://media.api-sports.io/football/players/${id}.png`

function shortKst(iso: string) {
  const d = new Date(iso)
  const date = d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", weekday: "short" })
  const time = d.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false })
  return { date, time }
}

export default function KoreanWeekHub({ weeks }: { weeks: PlayerWeek[] }) {
  const upcoming = weeks
    .filter((w) => w.next)
    .sort((a, b) => new Date(a.next!.date).getTime() - new Date(b.next!.date).getTime())

  const MAIN = ["프리미어리그", "라리가", "분데스리가", "세리에A", "리그1"]
  const rows: UpcomingRow[] = upcoming.map(({ player, teamNameKo, next }) => {
    const t = shortKst(next!.date)
    const lg = koLeague(next!.leagueName)
    const group = MAIN.includes(lg) ? lg : /챔피언스리그|유로파|컨퍼런스/.test(lg) ? "유럽대항전" : "그 외"
    return {
      id: player.id,
      name: player.name,
      teamKo: teamNameKo,
      oppKo: koTeam(next!.opponentName),
      oppLogo: next!.isHome ? next!.awayLogo : next!.homeLogo,
      home: next!.isHome,
      group,
      leagueKo: lg,
      time: t.time,
      date: t.date,
      href: matchLinkHref(next!.slugSource),
      calTitle: `${player.name} · ${koTeam(next!.homeName)} vs ${koTeam(next!.awayName)}`,
      startIso: next!.date,
      calId: `${player.id}-${next!.fixtureId}`,
    }
  })

  const all = weeks
    .flatMap((w) => w.recent.map((m) => ({ w, m })))
    .sort((a, b) => new Date(b.m.date).getTime() - new Date(a.m.date).getTime())
  // 뛴 경기만 목록에. (2026-10-17) 날짜별로 묶고, "출전 없음"은 7일 동안 한 경기도 못 뛴 선수만 적는다
  // (예전엔 한 경기라도 결장이 있으면 적어서, 위 목록에 있는 선수가 아래 "출전 기록 없음"에도 같이 나왔다)
  const played = all.filter(({ m }) => m.played)
  const playedIds = new Set(played.map(({ w }) => w.player.id))
  const benched = [...new Set(all.filter(({ w }) => !playedIds.has(w.player.id)).map(({ w }) => w.player.name))]
  const days: { key: string; label: string; items: typeof played }[] = []
  for (const it of played) {
    const key = new Date(it.m.date).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })
    const last = days[days.length - 1]
    if (last && last.key === key) last.items.push(it)
    else days.push({ key, label: shortKst(it.m.date).date, items: [it] })
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
      {/* 최근 7일 활약 */}
      <section className={`${CARD} flex flex-col`}>
        <h2 className="text-base font-semibold text-floodlight">최근 7일 활약</h2>
        <p className="text-sm text-floodlight/70 mt-1 mb-2">출전한 경기만 · 평점과 출전 시간</p>
        {played.length === 0 ? (
          <p className="text-sm text-floodlight/60 py-6">최근 7일 동안 출전한 경기가 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {days.map((d) => (
              <div key={d.key}>
                <p className="text-xs font-bold text-score-amber mb-1">{d.label}</p>
                <ul className="divide-y divide-turf-line/40 border-t border-turf-line/40">
                  {d.items.map(({ w, m }) => {
                    const r: RecentRowData = {
                      playerId: w.player.id,
                      name: w.player.name,
                      teamKo: w.teamNameKo,
                      photo: photo(w.player.id),
                      goals: m.goals,
                      assists: m.assists,
                      red: m.red,
                      yellow: m.yellow,
                      result: m.result,
                      myScore: m.isHome ? m.homeScore : m.awayScore,
                      oppScore: m.isHome ? m.awayScore : m.homeScore,
                      oppKo: koTeam(m.opponentName),
                      isHome: m.isHome,
                      leagueKo: koLeague(m.leagueName),
                      rating: m.rating,
                      minutes: m.minutes,
                      substitute: m.substitute,
                      matchHref: matchLinkHref(m.slugSource),
                      detail: m.detail,
                    }
                    return <KoreanRecentRow key={`${w.player.id}-${m.fixtureId}`} r={r} />
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
        {benched.length > 0 && (
          <p className="text-sm text-floodlight/65 mt-auto pt-3 border-t border-turf-line/40">최근 7일 출전 없음: {benched.join(", ")}</p>
        )}
      </section>

      {/* 다음 경기 일정 */}
      <section className={CARD}>
        <h2 className="text-base font-semibold text-floodlight">다음 경기 일정</h2>
        <p className="text-sm text-floodlight/70 mt-1 mb-2">한국 시간 · 📅를 누르면 내 캘린더에 저장(30분 전 알림)</p>
        {upcoming.length === 0 ? (
          <p className="text-sm text-floodlight/60 py-6">예정된 경기 정보를 불러오지 못했습니다.</p>
        ) : (
          <UpcomingList rows={rows} />
        )}
      </section>
    </div>
  )
}
