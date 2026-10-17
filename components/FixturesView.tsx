"use client"

import { useState } from "react"
import Link from "next/link"
import { matchLinkHref } from "@/lib/slug"
import type { LeagueFixture } from "@/lib/leagueData"
import Logo from "@/components/Logo"

const FINISHED_CODES = ["FT", "AET", "PEN"]
type Mode = "date" | "round" | "team"

function FixtureRow({ fx, focusTeam }: { fx: LeagueFixture; focusTeam?: string }) {
  const finished = FINISHED_CODES.includes(fx.fixture.status.short)
  const timeText = new Date(fx.fixture.date).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false })
  // 팀별 보기에서 고른 팀 기준 승/무/패
  let res: "W" | "D" | "L" | null = null
  if (finished && focusTeam && fx.goals.home != null && fx.goals.away != null) {
    const isHome = fx.teams.home.name === focusTeam
    const my = isHome ? fx.goals.home : fx.goals.away
    const op = isHome ? fx.goals.away : fx.goals.home
    res = my > op ? "W" : my < op ? "L" : "D"
  }
  const RES = { W: ["승", "bg-emerald-500/20 text-emerald-300"], D: ["무", "bg-floodlight/10 text-floodlight/60"], L: ["패", "bg-red-500/20 text-red-300"] } as const
  return (
    <Link
      href={matchLinkHref(fx)} prefetch={false}
      className="flex items-center justify-center gap-3 px-4 py-3.5 text-sm hover:bg-turf-line/20 border-b border-turf-line/20 last:border-b-0"
    >
      <span className="w-7 shrink-0 text-center">
        {res && <span className={`inline-block px-1.5 rounded text-[11px] font-bold ${RES[res][1]}`}>{RES[res][0]}</span>}
      </span>
      <span className={`flex-1 text-right truncate ${focusTeam && fx.teams.home.name === focusTeam ? "font-semibold text-floodlight" : ""}`}>{fx.teams.home.name}</span>
      <Logo src={fx.teams.home.logo} alt="" className="w-5 h-5 shrink-0" />
      {finished ? (
        <span className="font-data text-score-amber w-16 text-center shrink-0">{`${fx.goals.home} - ${fx.goals.away}`}</span>
      ) : (
        <span className="font-data text-sky-300 w-16 text-center shrink-0 text-xs border border-sky-400/40 rounded-full py-0.5">{timeText}</span>
      )}
      <Logo src={fx.teams.away.logo} alt="" className="w-5 h-5 shrink-0" />
      <span className={`flex-1 truncate ${focusTeam && fx.teams.away.name === focusTeam ? "font-semibold text-floodlight" : ""}`}>{fx.teams.away.name}</span>
      <span className="w-7 shrink-0" />
    </Link>
  )
}

function groupBy<T>(list: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of list) {
    const key = keyFn(item)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return map
}

const dateLabel = (fx: LeagueFixture) =>
  new Date(fx.fixture.date).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "long" })
const ts = (fx: LeagueFixture) => new Date(fx.fixture.date).getTime()
const SOON_MS = 14 * 86400_000
const PAST_STEP = 8 // 지난 경기: 날짜 묶음 8개씩 펼치기

function DateGroups({ groups, focusTeam }: { groups: Map<string, LeagueFixture[]>; focusTeam?: string }) {
  return (
    <>
      {[...groups.entries()].map(([label, list]) => (
        <div key={label} className="mb-3">
          <p className="px-1 pb-1.5 text-xs text-floodlight/55 font-medium border-b border-turf-line/40">{label}</p>
          {list.map((fx) => (
            <FixtureRow key={fx.fixture.id} fx={fx} focusTeam={focusTeam} />
          ))}
        </div>
      ))}
    </>
  )
}

// 구역 제목: 색 막대 + 큰 제목 + 경기 수. 다가오는(하늘) / 지난(노랑) / 이후(회색)로 색을 나눈다
function SectionTitle({ tone, title, count, first }: { tone: "soon" | "past" | "later"; title: string; count: number; first?: boolean }) {
  const bar = tone === "soon" ? "bg-sky-400" : tone === "past" ? "bg-score-amber" : "bg-floodlight/40"
  return (
    <div className={`flex items-center gap-2.5 mb-3 ${first ? "" : "mt-10 pt-6 border-t border-turf-line/50"}`}>
      <span aria-hidden className={`w-1.5 h-6 ${bar}`} />
      <h3 className="text-lg font-bold text-floodlight">{title}</h3>
      <span className="text-xs font-data text-floodlight/50">{count}경기</span>
    </div>
  )
}

// (2026-10-17) 최신 경기부터: 맨 위에 2주 안의 다가오는 경기(가까운 순), 그 아래 지난 경기(최근 순),
// 그보다 먼 일정은 맨 아래. 라운드별은 최근 라운드부터.
export default function FixturesView({ fixtures }: { fixtures: LeagueFixture[] }) {
  const [mode, setMode] = useState<Mode>("date")
  const [teamFilter, setTeamFilter] = useState<string>("전체")
  const [pastShown, setPastShown] = useState(PAST_STEP)
  const [now] = useState(() => Date.now())

  const asc = [...fixtures].sort((a, b) => ts(a) - ts(b))

  const teamNames = Array.from(new Set(asc.flatMap((fx) => [fx.teams.home.name, fx.teams.away.name]))).sort()

  if (asc.length === 0) {
    return <p className="text-floodlight/40 text-sm py-6">경기 일정 정보가 없습니다.</p>
  }

  const base =
    mode === "team" && teamFilter !== "전체"
      ? asc.filter((fx) => fx.teams.home.name === teamFilter || fx.teams.away.name === teamFilter)
      : asc

  const focus = mode === "team" && teamFilter !== "전체" ? teamFilter : undefined
  const isDone = (fx: LeagueFixture) => FINISHED_CODES.includes(fx.fixture.status.short) || ts(fx) < now - 3 * 3600_000
  const soon = base.filter((fx) => !isDone(fx) && ts(fx) - now <= SOON_MS)
  const past = base.filter(isDone).reverse()
  const later = base.filter((fx) => !isDone(fx) && ts(fx) - now > SOON_MS)

  const pastGroups = groupBy(past, dateLabel)
  const pastEntries = [...pastGroups.entries()]
  const pastVisible = new Map(pastEntries.slice(0, pastShown))

  // 라운드별: 라운드 안의 마지막 경기 시각 기준으로 최근 라운드가 위로
  const rounds = [...groupBy(asc, (fx) => fx.league?.round ?? "라운드 정보 없음").entries()].sort((a, b) => {
    const lastA = Math.max(...a[1].map(ts))
    const lastB = Math.max(...b[1].map(ts))
    const aDone = a[1].every(isDone)
    const bDone = b[1].every(isDone)
    // 진행 중/다가오는 라운드가 가장 위, 그다음 끝난 라운드 최근 순, 먼 미래 라운드는 아래
    if (aDone !== bDone) {
      const aSoon = !aDone && Math.min(...a[1].map(ts)) - now <= SOON_MS
      const bSoon = !bDone && Math.min(...b[1].map(ts)) - now <= SOON_MS
      if (aSoon !== bSoon) return aSoon ? -1 : 1
      return aDone ? -1 : 1
    }
    return aDone ? lastB - lastA : lastA - lastB
  })

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["date", "round", "team"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              mode === m ? "bg-floodlight text-pitch-night" : "bg-turf-line/40 text-floodlight/60 hover:text-floodlight"
            }`}
          >
            {m === "date" ? "날짜별" : m === "round" ? "라운드별" : "팀별"}
          </button>
        ))}

        {mode === "team" && (
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="ml-auto bg-turf-line/40 border border-turf-line text-floodlight text-xs rounded-full px-3 py-1.5 focus:outline-none focus:border-score-amber cursor-pointer"
          >
            <option value="전체" className="bg-pitch-night">전체 팀</option>
            {teamNames.map((name) => (
              <option key={name} value={name} className="bg-pitch-night">
                {name}
              </option>
            ))}
          </select>
        )}
      </div>

      {mode === "round" ? (
        rounds.map(([label, list]) => (
          <div key={label} className="mb-2">
            <p className="px-4 py-2.5 bg-turf-line/30 rounded text-sm text-floodlight/70 font-medium">{label}</p>
            {list.map((fx) => (
              <FixtureRow key={fx.fixture.id} fx={fx} />
            ))}
          </div>
        ))
      ) : (
        <div>
          {soon.length > 0 && (
            <>
              <SectionTitle tone="soon" title="다가오는 경기" count={soon.length} first />
              <DateGroups groups={groupBy(soon, dateLabel)} focusTeam={focus} />
            </>
          )}
          {past.length > 0 && (
            <>
              <SectionTitle tone="past" title="지난 경기 · 최근 순" count={past.length} first={soon.length === 0} />
              <DateGroups groups={pastVisible} focusTeam={focus} />
              {pastEntries.length > pastShown && (
                <button
                  type="button"
                  onClick={() => setPastShown((n) => n + PAST_STEP)}
                  className="w-full mt-1 py-3 text-sm text-floodlight/70 border border-turf-line/60 hover:text-floodlight hover:border-floodlight/40 transition-colors"
                >
                  이전 경기 더 보기 ▾
                </button>
              )}
            </>
          )}
          {later.length > 0 && (
            <>
              <SectionTitle tone="later" title="이후 일정" count={later.length} first={soon.length === 0 && past.length === 0} />
              <DateGroups groups={groupBy(later, dateLabel)} focusTeam={focus} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
