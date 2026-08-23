/**
 * /api/xg?home=<팀명>&away=<팀명>&date=<YYYY-MM-DD>&league=<리그id>
 *
 * 1순위: Sofascore 비공식 API (모든 리그, xG + 빅찬스 + 점유율)
 * 2순위: Understat (5대 리그만, xG)
 * 둘 다 실패: null 반환
 */

import { NextRequest, NextResponse } from "next/server"

// Understat 리그명 매핑 (API-Football league id → Understat slug)
const UNDERSTAT_LEAGUE_MAP: Record<number, string> = {
  39:  "EPL",
  140: "La_liga",
  78:  "Bundesliga",
  135: "Serie_A",
  61:  "Ligue_1",
}

export interface XGData {
  source: "sofascore" | "understat"
  home: { xg: number; bigChances?: number }
  away: { xg: number; bigChances?: number }
  homePossession?: number
  awayPossession?: number
}

// ── Sofascore ──────────────────────────────────────────────────────────────
async function fetchSofascore(
  home: string,
  away: string,
  date: string
): Promise<XGData | null> {
  try {
    // 1단계: 날짜로 경기 검색
    const searchRes = await fetch(
      `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${date}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
          Referer: "https://www.sofascore.com/",
        },
        next: { revalidate: 3600 },
      }
    )
    if (!searchRes.ok) return null
    const searchData = await searchRes.json()
    const events: { id: number; homeTeam: { name: string }; awayTeam: { name: string } }[] =
      searchData.events ?? []

    // 팀명 퍼지 매칭 (앞 5글자 비교)
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
    const homeN = normalize(home)
    const awayN = normalize(away)

    const match = events.find((e) => {
      const h = normalize(e.homeTeam.name)
      const a = normalize(e.awayTeam.name)
      return (
        (h.includes(homeN.slice(0, 5)) || homeN.includes(h.slice(0, 5))) &&
        (a.includes(awayN.slice(0, 5)) || awayN.includes(a.slice(0, 5)))
      )
    })
    if (!match) return null

    // 2단계: 경기 통계 조회
    const statsRes = await fetch(
      `https://api.sofascore.com/api/v1/event/${match.id}/statistics`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
          Referer: `https://www.sofascore.com/`,
        },
        next: { revalidate: 3600 },
      }
    )
    if (!statsRes.ok) return null
    const statsData = await statsRes.json()

    // Sofascore 통계 구조: statistics[].groups[].statisticsItems[]
    let homeXg = 0,
      awayXg = 0,
      homeBig = 0,
      awayBig = 0,
      homePoss = 0,
      awayPoss = 0

    for (const period of statsData.statistics ?? []) {
      if (period.period !== "ALL") continue
      for (const group of period.groups ?? []) {
        for (const item of group.statisticsItems ?? []) {
          const key = (item.key ?? "").toLowerCase()
          if (key === "expectedgoals") {
            homeXg = parseFloat(item.home ?? "0") || 0
            awayXg = parseFloat(item.away ?? "0") || 0
          }
          if (key === "bigchancescreated" || key === "bigchances") {
            homeBig = parseInt(item.home ?? "0") || 0
            awayBig = parseInt(item.away ?? "0") || 0
          }
          if (key === "ballpossession") {
            homePoss = parseInt(item.home ?? "0") || 0
            awayPoss = parseInt(item.away ?? "0") || 0
          }
        }
      }
    }

    if (homeXg === 0 && awayXg === 0) return null

    return {
      source: "sofascore",
      home: { xg: homeXg, bigChances: homeBig },
      away: { xg: awayXg, bigChances: awayBig },
      homePossession: homePoss || undefined,
      awayPossession: awayPoss || undefined,
    }
  } catch {
    return null
  }
}

// ── Understat ──────────────────────────────────────────────────────────────
async function fetchUnderstat(
  home: string,
  away: string,
  date: string,
  leagueId: number
): Promise<XGData | null> {
  const leagueSlug = UNDERSTAT_LEAGUE_MAP[leagueId]
  if (!leagueSlug) return null

  try {
    const season = parseInt(date.slice(0, 4)) - (parseInt(date.slice(5, 7)) < 7 ? 1 : 0)
    const leagueUrl = `https://understat.com/league/${leagueSlug}/${season}`

    const res = await fetch(leagueUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const html = await res.text()

    // Understat는 HTML에 JSON을 인코딩해서 박아넣음
    const match = html.match(/datesData\s*=\s*JSON\.parse\('(.+?)'\)/)
    if (!match) return null

    const decoded = match[1]
      .replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      )
      .replace(/\\'/g, "'")
    const datesData = JSON.parse(decoded)

    // 날짜와 팀명으로 경기 찾기
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
    const homeN = normalize(home)
    const awayN = normalize(away)
    const targetDate = date.slice(0, 10) // YYYY-MM-DD

    for (const dateGroup of datesData) {
      for (const fixture of dateGroup) {
        const fDate = (fixture.datetime ?? "").slice(0, 10)
        if (fDate !== targetDate) continue
        const h = normalize(fixture.h?.title ?? "")
        const a = normalize(fixture.a?.title ?? "")
        if (
          (h.includes(homeN.slice(0, 5)) || homeN.includes(h.slice(0, 5))) &&
          (a.includes(awayN.slice(0, 5)) || awayN.includes(a.slice(0, 5)))
        ) {
          const homeXg = parseFloat(fixture.xG?.h ?? "0") || 0
          const awayXg = parseFloat(fixture.xG?.a ?? "0") || 0
          if (homeXg === 0 && awayXg === 0) return null
          return {
            source: "understat",
            home: { xg: Math.round(homeXg * 100) / 100 },
            away: { xg: Math.round(awayXg * 100) / 100 },
          }
        }
      }
    }
    return null
  } catch {
    return null
  }
}

// ── Route handler ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const home = searchParams.get("home") ?? ""
  const away = searchParams.get("away") ?? ""
  const date = searchParams.get("date") ?? ""
  const leagueId = parseInt(searchParams.get("league") ?? "0")

  if (!home || !away || !date) {
    return NextResponse.json({ xg: null }, { status: 400 })
  }

  // 1순위: Sofascore
  const sofascore = await fetchSofascore(home, away, date)
  if (sofascore) {
    return NextResponse.json({ xg: sofascore })
  }

  // 2순위: Understat (5대 리그만)
  const understat = await fetchUnderstat(home, away, date, leagueId)
  if (understat) {
    return NextResponse.json({ xg: understat })
  }

  return NextResponse.json({ xg: null })
}
