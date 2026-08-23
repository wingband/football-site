// 경기 상세 페이지에 나가는 짧은 AI 리뷰(3문장)를 경기별로 DB에 저장한다.
//
// fetch의 cache: "force-cache"만으로도 Next 데이터 캐시에 남지만,
//  - 배포할 때마다 캐시가 비어서 모든 경기 리뷰를 다시 생성하게 되고
//  - 캐시 키에 요청 본문(=스탯 문자열)이 들어가서, 스탯 값이 조금만 달라져도 새로 호출된다
// 종료된 경기 리뷰는 영구히 같은 내용이므로 match_id로 저장해두는 편이 확실하다.
//
// articles 테이블을 쓰지 않는 이유: 그 테이블은 title/content가 NOT NULL이고
// match_id가 UNIQUE라서, 3문장 리뷰만 있는 행을 넣으면 자리표시자 제목이 필요하고
// 나중에 같은 경기의 정식 기사와 충돌한다 (/stories 목록에도 섞여 들어감)
import { neon } from "@neondatabase/serverless"

function getSql() {
  return neon(process.env.DATABASE_URL!)
}

let tableReady: Promise<unknown> | null = null

function ensureTable() {
  if (!tableReady) {
    const sql = getSql()
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS match_stories (
        match_id INTEGER PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
  }
  return tableReady
}

export async function getCachedStory(matchId: number): Promise<string | null> {
  try {
    await ensureTable()
    const sql = getSql()
    const rows = await sql`SELECT content FROM match_stories WHERE match_id = ${matchId}`
    const content = rows[0]?.content as string | undefined
    return content && content.trim().length > 0 ? content : null
  } catch (err) {
    // 캐시 조회 실패는 치명적이지 않다 — GPT를 호출해서 화면은 정상으로 유지
    console.error("AI 리뷰 캐시 조회 실패:", err)
    return null
  }
}

export async function saveCachedStory(matchId: number, content: string): Promise<void> {
  if (!content.trim()) return
  try {
    await ensureTable()
    const sql = getSql()
    await sql`
      INSERT INTO match_stories (match_id, content)
      VALUES (${matchId}, ${content})
      ON CONFLICT (match_id) DO NOTHING
    `
  } catch (err) {
    console.error("AI 리뷰 캐시 저장 실패:", err)
  }
}
