"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { matchHref } from "@/lib/slug"
import { getMatchPhase } from "@/lib/matchStatus"
import { useFavorites } from "@/lib/useFavorites"
import { deriveFavoriteLeagues } from "@/lib/leagueFavorites"
import Logo from "@/components/Logo"

type Fixture = {
  fixture: {
    id: number
    date: string
    status: { long: string; short: string; elapsed: number | null }
  }
  teams: {
    home: { name: string; logo: string }
    away: { name: string; logo: string }
  }
  goals: {
    home: number | null
    away: number | null
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
  }
}

// API-Football에서 이 리그들의 id는 시즌이 바뀌어도 고정이라 미리 박아둠.
// 이러면 "오늘 그 리그 경기가 있는지"와 상관없이 항상 순위표로 이동 가능
const FEATURED_LEAGUES = [
  { id: 39,  country: "England",      name: "Premier League",       displayName: "Premier League" },
  { id: 2,   country: "World",        name: "UEFA Champions League", displayName: "Champions League" },
  { id: 140, country: "Spain",        name: "La Liga",              displayName: "La Liga" },
  { id: 78,  country: "Germany",      name: "Bundesliga",           displayName: "Bundesliga" },
  { id: 135, country: "Italy",        name: "Serie A",              displayName: "Serie A" },
  { id: 61,  country: "France",       name: "Ligue 1",              displayName: "Ligue 1" },
  { id: 3,   country: "World",        name: "UEFA Europa League",   displayName: "Europa League" },
  { id: 4,   country: "World",        name: "UEFA Europa Conference League", displayName: "Conference League" },
  { id: 292, country: "South Korea",  name: "K League 1",           displayName: "K League 1" },
  { id: 98,  country: "Japan",        name: "J1 League",            displayName: "J1 League" },
  { id: 45,  country: "England",      name: "FA Cup",               displayName: "FA Cup" },
]

// 가운데 경기 목록 정렬 우선순위 (숫자가 낮을수록 먼저)
// PL=1 고정, 유저 국가 리그=2, 이후 CL/LaLiga/Bundesliga/SerieA/Ligue1 순
const LEAGUE_SORT_ORDER: Record<number, number> = {
  39:  1,  // Premier League — 항상 최우선
  // 2번은 유저 국가 리그 (동적)
  2:   3,  // Champions League
  140: 4,  // La Liga
  78:  5,  // Bundesliga
  135: 6,  // Serie A
  61:  7,  // Ligue 1
  3:   8,  // Europa League
  4:   9,  // Conference League
  292: 10, // K League 1
  98:  11, // J1 League
  45:  12, // FA Cup
}

// ── 리그 ID → 로컬 고품질 로고 매핑 ─────────────────────────────────────
// public/leagues/ 폴더에 저장된 이미지를 우선 사용
const LOCAL_LEAGUE_LOGOS: Record<number, string> = {
  39:  "/leagues/pl.png",
  2:   "/leagues/cl.png",
  140: "/leagues/laliga.png",
  78:  "/leagues/bundesliga.png",
  135: "/leagues/seriea.png",
  61:  "/leagues/ligue1.png",
  3:   "/leagues/europa.png",
  292: "/leagues/kleague.png",
  45:  "/leagues/facup.png",
}

function getLeagueLogo(leagueId: number, fallback: string): string {
  return LOCAL_LEAGUE_LOGOS[leagueId] ?? fallback
}

function isFeatured(country: string, name: string) {
  return FEATURED_LEAGUES.some(
    (f) =>
      f.name.toLowerCase() === name.toLowerCase() &&
      f.country.toLowerCase().replace(/[\s-]/g, "") ===
        country.toLowerCase().replace(/[\s-]/g, "")
  )
}

function formatKickoff(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function MatchRow({ match }: { match: Fixture }) {
  const phase = getMatchPhase(match.fixture.status.short)

  return (
    <Link
      href={matchHref(match)}
      className="flex items-center gap-3 px-4 py-3 hover:bg-turf-line/40 transition-colors border-b border-turf-line/40 last:border-b-0"
    >
      <div className="w-12 shrink-0 text-center">
        {phase === "live" ? (
          <span className="text-live-red text-xs font-display font-bold flex flex-col items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-live-red animate-pulse mb-0.5" />
            {match.fixture.status.elapsed ?? ""}&apos;
          </span>
        ) : phase === "upcoming" ? (
          <span className="text-floodlight/40 text-xs font-data">{formatKickoff(match.fixture.date)}</span>
        ) : (
          <span className="text-floodlight/30 text-[10px]">종료</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Logo src={match.teams.home.logo} alt="" className="w-4 h-4 shrink-0" />
          <span className="text-sm text-floodlight/90 truncate">{match.teams.home.name}</span>
          <span className="ml-auto text-sm font-data font-semibold text-floodlight pl-2">
            {phase === "upcoming" ? "" : match.goals.home ?? "-"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Logo src={match.teams.away.logo} alt="" className="w-4 h-4 shrink-0" />
          <span className="text-sm text-floodlight/90 truncate">{match.teams.away.name}</span>
          <span className="ml-auto text-sm font-data font-semibold text-floodlight pl-2">
            {phase === "upcoming" ? "" : match.goals.away ?? "-"}
          </span>
        </div>
      </div>
    </Link>
  )
}

function StarButton({
  active,
  onClick,
}: {
  active: boolean
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick(e)
      }}
      className={`shrink-0 text-sm leading-none ${
        active ? "text-score-amber" : "text-floodlight/25 hover:text-floodlight/50"
      }`}
      aria-label="즐겨찾기"
    >
      {active ? "★" : "☆"}
    </button>
  )
}

// 사이드바에서 리그 하나를 나타내는 줄. 클릭하면 그 리그의 순위표 페이지(/leagues/[id])로 이동.
// 별 아이콘만 클릭했을 땐 이동하지 않고 즐겨찾기만 토글됨.
function LeagueLink({
  id,
  logo,
  label,
  isFavoriteLeague,
  onToggleFavorite,
  size = "sm",
  noMatchToday = false,
}: {
  id: number | null
  logo: string | null
  label: string
  isFavoriteLeague: boolean
  onToggleFavorite: () => void
  size?: "sm" | "xs"
  noMatchToday?: boolean
}) {
  const content = (
    <>
      {logo ? (
        <Logo src={logo} alt="" className="w-4 h-4 shrink-0 brightness-150 saturate-150" />
      ) : (
        <span className="w-4 h-4 shrink-0 rounded-full bg-turf-line" />
      )}
      <span className="truncate flex-1">{label}</span>
      {/* noMatchToday indicator removed */}
      <StarButton active={isFavoriteLeague} onClick={onToggleFavorite} />
    </>
  )

  const baseClass =
    size === "xs"
      ? "w-full flex items-center gap-2 text-left px-3 py-1.5 rounded text-xs transition-colors"
      : "w-full flex items-center gap-2 text-left px-3 py-2 rounded text-sm transition-colors"

  if (!id) {
    return <div className={`${baseClass} text-floodlight/20 cursor-not-allowed`}>{content}</div>
  }

  return (
    <Link href={`/leagues/${id}`} className={`${baseClass} bg-turf-line/30 text-floodlight/80 hover:bg-turf-line/60`}>
      {content}
    </Link>
  )
}

export default function MatchesExplorer({ fixtures, userCountry }: { fixtures: Fixture[]; userCountry?: string }) {
  const [selectedLeague, setSelectedLeague] = useState<string>("전체")
  const [showMore, setShowMore] = useState(false)
  const [liveOnly, setLiveOnly] = useState(false)
  const [sortByTime, setSortByTime] = useState(false)
  const [query, setQuery] = useState("")
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const { favorites, toggleFavorite, isFavorite } = useFavorites()

  const { featured, restByCountry } = useMemo(() => {
    const seen = new Map<number, { id: number; name: string; country: string; logo: string }>()
    for (const f of fixtures) {
      seen.set(f.league.id, {
        id: f.league.id,
        name: f.league.name,
        country: f.league.country,
        logo: f.league.logo,
      })
    }
    const all = Array.from(seen.values())

    const featuredList = FEATURED_LEAGUES.map((f) => {
      const match = all.find(
        (l) =>
          l.name.toLowerCase() === f.name.toLowerCase() &&
          l.country.toLowerCase().replace(/[\s-]/g, "") ===
            f.country.toLowerCase().replace(/[\s-]/g, "")
      )
      return {
        displayName: f.displayName,
        apiName: match?.name ?? f.name,
        id: f.id,
        logo: getLeagueLogo(f.id, `https://media.api-sports.io/football/leagues/${f.id}.png`),
        available: !!match,
      }
    })

    const restMap = new Map<string, { id: number; name: string }[]>()
    for (const l of all) {
      if (isFeatured(l.country, l.name)) continue
      if (!restMap.has(l.country)) restMap.set(l.country, [])
      restMap.get(l.country)!.push({ id: l.id, name: l.name })
    }
    const rest = Array.from(restMap.entries())
      .map(([country, leagues]) => ({
        country,
        leagues: leagues.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.country.localeCompare(b.country))

    return { featured: featuredList, restByCountry: rest }
  }, [fixtures])

  // 즐겨찾기 섹션 목록. 주요 리그 섹션에서 빼지 않으므로 즐겨찾기한 리그는 두 곳에 동시에 표시된다
  const favoriteLeagues = useMemo(
    () =>
      deriveFavoriteLeagues(
        featured,
        fixtures.map((f) => ({
          id: f.league.id,
          name: f.league.name,
          logo: getLeagueLogo(f.league.id, f.league.logo),
        })),
        (id) => isFavorite(id)
      ),
    [featured, fixtures, favorites]
  )

  const filtered = useMemo(() => {
    let result = selectedLeague === "전체" ? fixtures : fixtures.filter((f) => String(f.league.id) === selectedLeague)

    if (liveOnly) {
      result = result.filter((f) => getMatchPhase(f.fixture.status.short) === "live")
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase()
      result = result.filter(
        (f) =>
          f.teams.home.name.toLowerCase().includes(q) ||
          f.teams.away.name.toLowerCase().includes(q) ||
          f.league.name.toLowerCase().includes(q)
      )
    }

    return result
  }, [fixtures, selectedLeague, liveOnly, query])

  const flatSorted = useMemo(() => {
    return [...filtered].sort(
      (a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
    )
  }, [filtered])

  const leagueGroups = useMemo(() => {
    const map = new Map<string, { league: Fixture["league"]; matches: Fixture[] }>()
    for (const f of filtered) {
      const key = String(f.league.id)  // 이름 대신 ID로 그룹핑 — "Premier League"가 여러 나라에 있어서 이름으로 하면 합쳐짐
      if (!map.has(key)) map.set(key, { league: f.league, matches: [] })
      map.get(key)!.matches.push(f)
    }
    for (const group of map.values()) {
      group.matches.sort(
        (a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
      )
    }
    // 국가 코드 → API-Football country 문자열 매핑 (IP 기반)
    const countryLeagueMap: Record<string, number> = {
      "KR": 292, // K League 1
      "JP": 98,  // J1 League
      "US": 253, // MLS
      "DE": 78,  // Bundesliga
      "ES": 140, // La Liga
      "IT": 135, // Serie A
      "FR": 61,  // Ligue 1
      "GB": 39,  // Premier League
    }
    const userLeagueId = userCountry ? (countryLeagueMap[userCountry] ?? null) : null

    function getLeaguePriority(leagueId: number): number {
      // 1) Premier League 무조건 최우선
      if (leagueId === 39) return 1
      // 2) 유저 국가 리그 2순위 (PL 제외)
      if (userLeagueId && leagueId === userLeagueId) return 2
      // 3) LEAGUE_SORT_ORDER에 있는 주요 리그
      const order = LEAGUE_SORT_ORDER[leagueId]
      if (order !== undefined) return order
      // 4) 그 외 리그
      return 999
    }

    return Array.from(map.values()).sort((a, b) => {
      // Premier League는 즐겨찾기 여부와 무관하게 무조건 최우선
      const aPL = a.league.id === 39
      const bPL = b.league.id === 39
      if (aPL !== bPL) return aPL ? -1 : 1

      // 즐겨찾기는 PL 다음 우선
      const aFav = isFavorite(a.league.id)
      const bFav = isFavorite(b.league.id)
      if (aFav !== bFav) return aFav ? -1 : 1

      const aPriority = getLeaguePriority(a.league.id)
      const bPriority = getLeaguePriority(b.league.id)
      if (aPriority !== bPriority) return aPriority - bPriority

      return a.league.name.localeCompare(b.league.name)
    })
  }, [filtered, favorites])

  function toggleCollapse(leagueId: number) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(leagueId)) next.delete(leagueId)
      else next.add(leagueId)
      return next
    })
  }

  return (
    <div className="flex gap-6">
      <aside className="w-60 shrink-0 hidden md:block">
        <div className="sticky top-20 bg-turf/40 border border-turf-line/60 p-4 max-h-[80vh] overflow-y-auto">
          <button
            onClick={() => setSelectedLeague("전체")}
            className={`w-full text-left px-3 py-2 rounded text-sm mb-3 transition-colors ${
              selectedLeague === "전체"
                ? "bg-score-amber text-pitch-night font-medium"
                : "text-floodlight/60 hover:bg-turf-line/40"
            }`}
          >
            전체 ({fixtures.length})
          </button>

          {favoriteLeagues.length > 0 && (
            <>
              <p className="text-[11px] uppercase text-score-amber px-1 mb-2 font-display tracking-wide">
                즐겨찾기
              </p>
              <div className="space-y-1 mb-5">
                {favoriteLeagues.map((league) => (
                  <LeagueLink
                    key={league.id}
                    id={league.id}
                    logo={league.logo}
                    label={league.name}
                    isFavoriteLeague={isFavorite(league.id)}
                    onToggleFavorite={() => toggleFavorite(league.id)}
                    noMatchToday={league.noMatchToday}
                  />
                ))}
              </div>
            </>
          )}

          <p className="text-[11px] uppercase text-floodlight/40 px-1 mb-2 font-display tracking-wide">
            주요 리그
          </p>
          <div className="space-y-1 mb-5">
            {/* 즐겨찾기한 리그는 위 즐겨찾기 섹션으로 옮겨가므로 여기서는 제외한다.
                즐겨찾기 목록은 오늘 경기가 없는 리그도 포함하므로(deriveFavoriteLeagues)
                여기서 빼도 화면에서 사라지지 않는다 */}
            {featured
              .filter((league) => !isFavorite(league.id))
              .map((league) => (
              <LeagueLink
                key={league.displayName}
                id={league.id}
                logo={league.logo}
                label={league.displayName}
                isFavoriteLeague={isFavorite(league.id)}
                onToggleFavorite={() => toggleFavorite(league.id)}
                noMatchToday={!league.available}
              />
            ))}
          </div>

          <button
            onClick={() => setShowMore((v) => !v)}
            className="w-full flex items-center justify-between text-left px-1 py-1 text-[11px] uppercase text-floodlight/40 hover:text-floodlight/70 mb-2 font-display tracking-wide"
          >
            <span>그 외 리그</span>
            <span>{showMore ? "▲" : "▼"}</span>
          </button>

          {showMore && (
            <div>
              {restByCountry.map(({ country, leagues }) => (
                <div key={country} className="mb-3">
                  <p className="text-[10px] uppercase text-floodlight/30 px-3 mb-1">{country}</p>
                  {leagues.map((league) => (
                    <LeagueLink
                      key={league.id}
                      id={league.id}
                      logo={null}
                      label={league.name}
                      isFavoriteLeague={isFavorite(league.id)}
                      onToggleFavorite={() => toggleFavorite(league.id)}
                      size="xs"
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {/* 모바일 전용: 가로 스크롤 리그 필터 칩 (사이드바가 md 미만에서 숨겨지므로 대체) */}
        <div className="flex md:hidden gap-2 overflow-x-auto pb-3 mb-3 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setSelectedLeague("전체")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedLeague === "전체"
                ? "bg-score-amber text-pitch-night"
                : "bg-turf/40 border border-turf-line text-floodlight/60"
            }`}
          >
            전체
          </button>
          {featured
            .filter((l) => l.available)
            .map((l) => (
              <button
                key={l.displayName}
                onClick={() => setSelectedLeague((prev) => (prev === String(l.id) ? "전체" : String(l.id)))}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedLeague === String(l.id)
                    ? "bg-score-amber text-pitch-night"
                    : "bg-turf/40 border border-turf-line text-floodlight/60"
                }`}
              >
                <Logo src={getLeagueLogo(l.id, l.logo)} alt="" className="w-3.5 h-3.5" />
                {l.displayName}
              </button>
            ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            onClick={() => setLiveOnly((v) => !v)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              liveOnly
                ? "bg-live-red text-floodlight"
                : "bg-turf/40 border border-turf-line text-floodlight/60 hover:text-floodlight"
            }`}
          >
            {liveOnly && <span className="inline-block w-1.5 h-1.5 rounded-full bg-floodlight mr-1.5 animate-pulse" />}
            진행중
          </button>
          <button
            onClick={() => setSortByTime((v) => !v)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              sortByTime
                ? "bg-score-amber text-pitch-night"
                : "bg-turf/40 border border-turf-line text-floodlight/60 hover:text-floodlight"
            }`}
          >
            시간순 정렬
          </button>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="팀/리그 필터"
            className="ml-auto w-40 sm:w-56 bg-turf/40 border border-turf-line rounded-full px-4 py-1.5 text-xs text-floodlight placeholder:text-floodlight/30 focus:outline-none focus:border-score-amber transition-colors"
          />
        </div>

        {sortByTime ? (
          <div className="bg-turf/40 border-l-2 border-score-amber">
            {flatSorted.map((match) => (
              <MatchRow key={match.fixture.id} match={match} />
            ))}
            {flatSorted.length === 0 && (
              <p className="text-floodlight/40 text-sm p-4">조건에 맞는 경기가 없습니다.</p>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {leagueGroups.map(({ league, matches }) => {
              const isCollapsed = collapsed.has(league.id)
              return (
                <section key={league.id} className="bg-turf/40 border-l-2 border-score-amber overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-turf-line/60">
                    <Logo src={getLeagueLogo(league.id, league.logo)} alt="" className="w-5 h-5" />
                    <Link
                      href={`/leagues/${league.id}`}
                      className="text-sm font-display uppercase tracking-wide text-floodlight/90 hover:text-score-amber"
                    >
                      {league.name}
                    </Link>
                    <span className="text-xs text-floodlight/30">{league.country}</span>
                    <span className="ml-auto text-xs text-floodlight/30 font-data">{matches.length}경기</span>
                    <StarButton
                      active={isFavorite(league.id)}
                      onClick={() => toggleFavorite(league.id)}
                    />
                    <button
                      onClick={() => toggleCollapse(league.id)}
                      className="text-floodlight/40 hover:text-floodlight text-xs ml-1"
                      aria-label="접기/펼치기"
                    >
                      {isCollapsed ? "▼" : "▲"}
                    </button>
                  </div>
                  {!isCollapsed && (
                    <div>
                      {matches.map((match) => (
                        <MatchRow key={match.fixture.id} match={match} />
                      ))}
                    </div>
                  )}
                </section>
              )
            })}

            {leagueGroups.length === 0 && (
              <p className="text-floodlight/40 text-sm">조건에 맞는 경기가 없습니다.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}