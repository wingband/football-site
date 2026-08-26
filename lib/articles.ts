import { neon } from "@neondatabase/serverless"

export type Article = {
  slug: string
  title: string
  matchId: number
  leagueName: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  homeLogo: string | null
  awayLogo: string | null
  content: string
  // 득점/어시스트 등 주요 활약 선수 이름 (팀명·리그명은 태그에 안 넣고 렌더링 시점에 합쳐서 보여줌)
  playerTags: string[]
  createdAt: string
}

// 목업 모드에서는 실제 DB를 전혀 건드리지 않고, 이 배열에만 임시로 저장(서버 재시작하면 초기화됨)
const mockArticleStore: Article[] = []

// Neon(=Vercel Postgres) 연결. DATABASE_URL 환경변수는 Vercel Storage에서 발급받은
// 연결 문자열을 .env.local(로컬)과 Vercel 프로젝트 환경변수(배포)에 각각 넣어야 함.
// 목업 모드일 땐 DATABASE_URL이 없어도 되도록, 실제 연결은 필요할 때만 만듦
function getSql() {
  return neon(process.env.DATABASE_URL!)
}

let tableReady: Promise<unknown> | null = null

// 테이블이 없으면 자동으로 만들어주는 함수. 여러 요청이 겹쳐도 딱 한 번만 실행되도록
// tableReady에 캐싱해둠
function ensureTable() {
  if (!tableReady) {
    const sql = getSql()
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS articles (
        slug TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        match_id INTEGER NOT NULL UNIQUE,
        league_name TEXT NOT NULL,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        home_score INTEGER,
        away_score INTEGER,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `.then(() => {
      // 이미 배포된 DB에는 home_logo/away_logo/player_tags 컬럼이 없을 수 있어서 추가로 보장해준다
      const sql2 = getSql()
      return sql2`
        ALTER TABLE articles
          ADD COLUMN IF NOT EXISTS home_logo TEXT,
          ADD COLUMN IF NOT EXISTS away_logo TEXT,
          ADD COLUMN IF NOT EXISTS player_tags TEXT[] NOT NULL DEFAULT '{}'
      `
    })
  }
  return tableReady
}

// DB에서 온 snake_case 행을 우리 코드에서 쓰는 camelCase Article 타입으로 변환
function rowToArticle(row: Record<string, unknown>): Article {
  return {
    slug: row.slug as string,
    title: row.title as string,
    matchId: row.match_id as number,
    leagueName: row.league_name as string,
    homeTeam: row.home_team as string,
    awayTeam: row.away_team as string,
    homeScore: row.home_score as number | null,
    awayScore: row.away_score as number | null,
    homeLogo: (row.home_logo as string | null) ?? null,
    awayLogo: (row.away_logo as string | null) ?? null,
    content: row.content as string,
    playerTags: (row.player_tags as string[] | null) ?? [],
    createdAt: (row.created_at as Date).toISOString(),
  }
}

export async function getAllArticles(): Promise<Article[]> {
  if (process.env.USE_MOCK_DATA === "true") {
    return [...mockArticleStore].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  await ensureTable()
  const sql = getSql()
  const rows = await sql`SELECT * FROM articles ORDER BY created_at DESC`
  return rows.map(rowToArticle)
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  if (process.env.USE_MOCK_DATA === "true") {
    return mockArticleStore.find((a) => a.slug === slug) ?? null
  }

  await ensureTable()
  const sql = getSql()
  const rows = await sql`SELECT * FROM articles WHERE slug = ${slug} LIMIT 1`
  return rows.length > 0 ? rowToArticle(rows[0]) : null
}

// match_id로 기존 기사 조회. 같은 경기 기사를 다시 생성(=GPT 재호출)하지 않으려고 씀.
// saveArticle이 ON CONFLICT DO NOTHING이라, 이 확인 없이 돌리면 GPT 응답을 받고 나서
// 조용히 버리는 낭비가 생긴다
export async function getArticleByMatchId(matchId: number): Promise<Article | null> {
  if (process.env.USE_MOCK_DATA === "true") {
    return mockArticleStore.find((a) => a.matchId === matchId) ?? null
  }

  await ensureTable()
  const sql = getSql()
  const rows = await sql`SELECT * FROM articles WHERE match_id = ${matchId} LIMIT 1`
  return rows.length > 0 ? rowToArticle(rows[0]) : null
}

export async function saveArticle(article: Article): Promise<void> {
  if (process.env.USE_MOCK_DATA === "true") {
    if (mockArticleStore.some((a) => a.matchId === article.matchId)) return
    mockArticleStore.unshift(article)
    return
  }

  await ensureTable()
  const sql = getSql()
  // match_id가 이미 있으면(같은 경기 기사가 이미 있으면) 조용히 건너뜀 (중복 방지)
  await sql`
    INSERT INTO articles (slug, title, match_id, league_name, home_team, away_team, home_score, away_score, home_logo, away_logo, content, player_tags)
    VALUES (${article.slug}, ${article.title}, ${article.matchId}, ${article.leagueName}, ${article.homeTeam}, ${article.awayTeam}, ${article.homeScore}, ${article.awayScore}, ${article.homeLogo}, ${article.awayLogo}, ${article.content}, ${article.playerTags})
    ON CONFLICT (match_id) DO NOTHING
  `
}

// 특정 팀 이름(부분 일치)으로 기사를 지운다. 오래된/잘못된 기사 하나를 지목해서
// 지우고 크론으로 재생성할 때 씀
export async function deleteArticleByTeams(homeTeam: string, awayTeam: string): Promise<string[]> {
  if (process.env.USE_MOCK_DATA === "true") {
    const before = mockArticleStore.length
    const removed = mockArticleStore
      .filter((a) => a.homeTeam.includes(homeTeam) && a.awayTeam.includes(awayTeam))
      .map((a) => a.slug)
    mockArticleStore.splice(
      0,
      before,
      ...mockArticleStore.filter((a) => !(a.homeTeam.includes(homeTeam) && a.awayTeam.includes(awayTeam)))
    )
    return removed
  }

  await ensureTable()
  const sql = getSql()
  const rows = await sql`
    DELETE FROM articles
    WHERE home_team ILIKE ${"%" + homeTeam + "%"} AND away_team ILIKE ${"%" + awayTeam + "%"}
    RETURNING slug
  `
  return rows.map((r) => r.slug as string)
}

export function slugify(homeTeam: string, awayTeam: string, matchId: number): string {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  return `${clean(homeTeam)}-vs-${clean(awayTeam)}-${matchId}`
}

// content가 minLength 미만인 짧은 기사를 삭제하고 삭제된 slug 목록을 반환한다
export async function deleteShortArticles(minLength = 500): Promise<string[]> {
  if (process.env.USE_MOCK_DATA === "true") {
    const before = mockArticleStore.length
    const removed = mockArticleStore.filter((a) => a.content.length < minLength).map((a) => a.slug)
    mockArticleStore.splice(0, before, ...mockArticleStore.filter((a) => a.content.length >= minLength))
    return removed
  }

  await ensureTable()
  const sql = getSql()
  const rows = await sql`
    DELETE FROM articles
    WHERE LENGTH(content) < ${minLength}
    RETURNING slug
  `
  return rows.map((r) => r.slug as string)
}

// 로고 저장 기능 배포 이전에 생성된 기사는 home_logo/away_logo가 비어있다.
// 크론이 같은 경기를 다시 만날 때(이미 기사가 있어 GPT는 다시 부르지 않는 경우)
// 비어있는 로고만 조용히 채워준다
export async function backfillArticleLogos(
  matchId: number,
  homeLogo: string | null,
  awayLogo: string | null
): Promise<void> {
  if (process.env.USE_MOCK_DATA === "true") return
  if (!homeLogo && !awayLogo) return

  await ensureTable()
  const sql = getSql()
  await sql`
    UPDATE articles
    SET home_logo = COALESCE(home_logo, ${homeLogo}), away_logo = COALESCE(away_logo, ${awayLogo})
    WHERE match_id = ${matchId} AND (home_logo IS NULL OR away_logo IS NULL)
  `
}

// 팀 로고가 없는 기사를 삭제한다 (로고 저장 기능 배포 이전에 생성된 기사들).
// 크론 재실행 시 로고가 채워진 채로 재생성된다
export async function deleteArticlesMissingLogos(): Promise<string[]> {
  if (process.env.USE_MOCK_DATA === "true") return []

  await ensureTable()
  const sql = getSql()
  const rows = await sql`
    DELETE FROM articles
    WHERE home_logo IS NULL OR away_logo IS NULL
    RETURNING slug
  `
  return rows.map((r) => r.slug as string)
}
// ── 경기 프리뷰 ──────────────────────────────────────────────────────────────
export type Preview = {
  slug: string
  matchId: number
  title: string
  leagueName: string
  homeTeam: string
  awayTeam: string
  kickoffAt: string   // ISO 날짜
  content: string
  createdAt: string
}

let previewTableReady: Promise<unknown> | null = null
function ensurePreviewTable() {
  if (!previewTableReady) {
    const sql = getSql()
    previewTableReady = sql`
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
  return previewTableReady
}

function rowToPreview(row: Record<string, unknown>): Preview {
  return {
    slug: row.slug as string,
    matchId: row.match_id as number,
    title: row.title as string,
    leagueName: row.league_name as string,
    homeTeam: row.home_team as string,
    awayTeam: row.away_team as string,
    kickoffAt: row.kickoff_at as string,
    content: row.content as string,
    createdAt: row.created_at as string,
  }
}

export async function savePreview(preview: Preview): Promise<void> {
  if (process.env.USE_MOCK_DATA === "true") return
  await ensurePreviewTable()
  const sql = getSql()
  await sql`
    INSERT INTO previews (slug, match_id, title, league_name, home_team, away_team, kickoff_at, content, created_at)
    VALUES (${preview.slug}, ${preview.matchId}, ${preview.title}, ${preview.leagueName},
            ${preview.homeTeam}, ${preview.awayTeam}, ${preview.kickoffAt}, ${preview.content}, ${preview.createdAt})
    ON CONFLICT (match_id) DO NOTHING
  `
}

export async function getAllPreviews(): Promise<Preview[]> {
  if (process.env.USE_MOCK_DATA === "true") return []
  await ensurePreviewTable()
  const sql = getSql()
  const rows = await sql`
    SELECT * FROM previews ORDER BY kickoff_at ASC LIMIT 20
  `
  return rows.map(rowToPreview)
}
