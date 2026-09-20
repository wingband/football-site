import { NextRequest, NextResponse } from "next/server"
import { generateMatchPreview } from "@/lib/generatePreview"
import { savePreview, slugify } from "@/lib/articles"
import { fetchApiFootball } from "@/lib/apiFootballClient"

const TARGET_LEAGUE_IDS = [39, 140, 78, 292, 135, 61]
const LEAGUE_PRIORITY: Record<number, number> = {
  39: 1, 140: 2, 78: 3, 292: 4, 135: 5, 61: 6,
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 })
  }

  // 내일 경기 가져오기
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split("T")[0]

  // (2026-09-20) 기존엔 fetch를 직접 호출하고 errors 필드를 체크하지 않아서, API
  // 레이트리밋 시 "내일 경기 없음"으로 오인해 프리뷰를 하나도 못 만들면서도
  // 조용히 200을 반환하는 문제가 있었다. fetchApiFootball()로 통합하되, 이 최상위
  // 조회가 실패하면 크론 전체가 죽는 대신 안전하게 0건 생성으로 종료한다
  let fixtures: any[] = []
  try {
    fixtures = await fetchApiFootball(`/fixtures?date=${tomorrowStr}`, { revalidate: 3600 })
  } catch (err) {
    console.error("generate-previews: 경기 목록 조회 실패:", err instanceof Error ? err.message : err)
    return NextResponse.json({ ok: false, createdCount: 0, slugs: [], error: "경기 목록 조회 실패" })
  }

  const targets = fixtures
    .filter((f: { league: { id: number }; fixture: { status: { short: string } } }) =>
      TARGET_LEAGUE_IDS.includes(f.league.id) &&
      f.fixture.status.short === "NS"  // Not Started만
    )
    .sort((a: { league: { id: number } }, b: { league: { id: number } }) =>
      (LEAGUE_PRIORITY[a.league.id] ?? 99) - (LEAGUE_PRIORITY[b.league.id] ?? 99)
    )
    .slice(0, 6)

  const created: string[] = []

  for (const match of targets) {
    // H2H 간단히 가져오기 — 실패해도 프리뷰 자체는 h2h 없이 계속 생성한다
    let h2hSummary = ""
    try {
      const h2h = await fetchApiFootball(
        `/fixtures/headtohead?h2h=${match.teams.home.id}-${match.teams.away.id}&last=5`,
        { revalidate: 3600 }
      ) as { teams: { home: { id: number; name: string }; away: { id: number; name: string } }; goals: { home: number | null; away: number | null } }[]
      if (h2h?.length) {
        const results = h2h.slice(0, 5).map((m: { teams: { home: { id: number; name: string }; away: { id: number; name: string } }; goals: { home: number | null; away: number | null } }) => {
          const hw = (m.goals.home ?? 0) > (m.goals.away ?? 0)
          const aw = (m.goals.away ?? 0) > (m.goals.home ?? 0)
          if (hw) return `${m.teams.home.name} 승`
          if (aw) return `${m.teams.away.name} 승`
          return "무"
        })
        h2hSummary = `최근 5경기: ${results.join(", ")}`
      }
    } catch { /* skip */ }

    const result = await generateMatchPreview({
      homeTeam: match.teams.home.name,
      awayTeam: match.teams.away.name,
      leagueName: match.league.name,
      kickoffAt: match.fixture.date,
      h2hSummary,
    })

    if (!result) continue

    const slug = `preview-${slugify(match.teams.home.name, match.teams.away.name, match.fixture.id)}`

    await savePreview({
      slug,
      matchId: match.fixture.id,
      title: result.title,
      leagueName: match.league.name,
      homeTeam: match.teams.home.name,
      awayTeam: match.teams.away.name,
      kickoffAt: match.fixture.date,
      content: result.content,
      createdAt: new Date().toISOString(),
    })

    created.push(slug)
  }

  return NextResponse.json({ ok: true, createdCount: created.length, slugs: created })
}
