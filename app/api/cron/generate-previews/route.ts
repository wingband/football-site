import { NextRequest, NextResponse } from "next/server"
import { generateMatchPreview } from "@/lib/generatePreview"
import { slugify } from "@/lib/articles"
import { neon } from "@neondatabase/serverless"

function getSql() { return neon(process.env.DATABASE_URL!) }

async function ensurePreviewTable() {
  const sql = getSql()
  await sql`
    CREATE TABLE IF NOT EXISTS previews (
      slug TEXT PRIMARY KEY,
      match_id INTEGER NOT NULL UNIQUE,
      title TEXT NOT NULL,
      league_name TEXT NOT NULL,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      kickoff_at TIMESTAMPTZ NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
}

async function savePreview(p: {
  slug: string; matchId: number; title: string; leagueName: string;
  homeTeam: string; awayTeam: string; kickoffAt: string; content: string; createdAt: string
}) {
  await ensurePreviewTable()
  const sql = getSql()
  await sql`
    INSERT INTO previews (slug, match_id, title, league_name, home_team, away_team, kickoff_at, content, created_at)
    VALUES (${p.slug}, ${p.matchId}, ${p.title}, ${p.leagueName}, ${p.homeTeam}, ${p.awayTeam}, ${p.kickoffAt}, ${p.content}, ${p.createdAt})
    ON CONFLICT (match_id) DO NOTHING
  `
}

const TARGET_LEAGUE_IDS = [39, 2, 140, 78, 135, 61, 3]
const LEAGUE_PRIORITY: Record<number, number> = {
  39: 1, 2: 2, 140: 3, 78: 4, 135: 5, 61: 6, 3: 7,
}

async function apiFetch(path: string) {
  const res = await fetch(`https://v3.football.api-sports.io${path}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
    next: { revalidate: 3600 },
  })
  const data = await res.json()
  return data.response
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

  const fixtures = await apiFetch(`/fixtures?date=${tomorrowStr}`)

  const targets = (fixtures ?? [])
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
    // H2H 간단히 가져오기
    let h2hSummary = ""
    try {
      const h2h = await apiFetch(`/fixtures/headtohead?h2h=${match.teams.home.id}-${match.teams.away.id}&last=5`)
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
