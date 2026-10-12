import { neon } from "@neondatabase/serverless"

// 선수 영문 이름 → 한국 언론식 한글 표기 (2026-10-11).
// K리그 라운드 칼럼에 "Kim Dae-won", "Stefan Mugoša"처럼 영문이 섞여서 추가.
// - 한 번 바꾼 이름은 DB(player_name_ko)에 저장해 다음 칼럼에서도 같은 표기를 쓴다 (표기 흔들림 방지, AI 호출 절약)
// - 표기가 틀렸으면 DB에서 해당 행만 고치면 이후 모든 초안에 반영된다
// - 실패하면 영문 그대로 둔다 (초안 생성은 멈추지 않음)

const HANGUL = /[가-힣]/

let tableReady: Promise<unknown> | null = null
function sql() {
  return neon(process.env.DATABASE_URL!)
}
function ensureTable() {
  if (!tableReady) {
    tableReady = sql()`
      CREATE TABLE IF NOT EXISTS player_name_ko (
        name TEXT PRIMARY KEY,
        ko TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `.catch((err) => {
      tableReady = null
      throw err
    })
  }
  return tableReady.catch((e: unknown) => { tableReady = null; throw e })
}

export type NameHint = { name: string | null | undefined; team?: string }
export type KoName = (name: string | null | undefined) => string

async function askAI(items: { name: string; team?: string }[]): Promise<Record<string, string>> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: `축구 선수 이름을 한국 스포츠 언론(네이버 스포츠, 연합뉴스)에서 쓰는 한글 표기로 바꿔라.
- 한국 선수의 로마자 이름(예: "Kim Dae-won", "Lee Chung-Yong")은 원래 한글 이름(김대원, 이청용)으로.
- 외국 선수는 한국 언론의 관용 표기로 (예: "Stefan Mugoša" → "무고사", 성만 널리 쓰이면 성만 써도 된다. 모르면 원어 발음대로 음역).
- 축약형("T. Orobó")이면 성만 음역해라.
- 입력 문자열을 키로, 한글 표기를 값으로 하는 JSON만 출력: {"names": {"원래 이름": "한글"}}

${items.map((i) => `- ${i.name}${i.team ? ` (소속: ${i.team})` : ""}`).join("\n")}`,
        },
      ],
    }),
  })
  if (!res.ok) throw new Error(`이름 변환 실패 ${res.status}`)
  const data = await res.json()
  const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}")
  return (parsed?.names ?? {}) as Record<string, string>
}

export async function koPlayerNames(hints: NameHint[]): Promise<KoName> {
  const map = new Map<string, string>()
  const lookup: KoName = (n) => (n ? (map.get(n) ?? n) : "?")
  const teamOf = new Map<string, string | undefined>()
  for (const h of hints) if (h.name && !HANGUL.test(h.name) && !teamOf.has(h.name)) teamOf.set(h.name, h.team)
  const names = [...teamOf.keys()]
  if (!names.length || !process.env.DATABASE_URL) return lookup

  try {
    await ensureTable()
    const rows = (await sql()`SELECT name, ko FROM player_name_ko WHERE name = ANY(${names})`) as { name: string; ko: string }[]
    for (const r of rows) map.set(r.name, r.ko)

    // AI가 키를 "Lee Myung-jae"처럼 대소문자·하이픈·공백을 바꿔 돌려주는 경우가 있어서 느슨하게 맞춘다
    const norm = (n: string) => n.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "")
    const translate = async (list: string[]) => {
      for (let i = 0; i < list.length; i += 40) {
        const chunk = list.slice(i, i + 40)
        const out = await askAI(chunk.map((name) => ({ name, team: teamOf.get(name) })))
        const byNorm = new Map(Object.entries(out).map(([k, v]) => [norm(k), v]))
        for (const name of chunk) {
          const ko = String(out[name] ?? byNorm.get(norm(name)) ?? "").trim()
          // 한글이 들어 있고 영문이 남지 않았고 지나치게 길지 않을 때만 채택
          if (!ko || !HANGUL.test(ko) || /[A-Za-z]/.test(ko) || ko.length > 20) continue
          map.set(name, ko)
          await sql()`INSERT INTO player_name_ko (name, ko) VALUES (${name}, ${ko}) ON CONFLICT (name) DO NOTHING`
        }
      }
    }
    await translate(names.filter((n) => !map.has(n)))
    // 그래도 빠진 이름은 한 번 더 (적은 수로 다시 물으면 대부분 채워진다)
    const still = names.filter((n) => !map.has(n))
    if (still.length) await translate(still)
  } catch (err) {
    console.error("선수 이름 한글 변환 실패(영문 유지):", err instanceof Error ? err.message : err)
  }
  return lookup
}

// 관리자 화면(/columns/names): 저장된 표기 목록·수정
export async function listPlayerNames(limit = 500): Promise<{ name: string; ko: string }[]> {
  if (!process.env.DATABASE_URL) return []
  await ensureTable()
  return (await sql()`SELECT name, ko FROM player_name_ko ORDER BY created_at DESC LIMIT ${limit}`) as { name: string; ko: string }[]
}

export async function setPlayerName(name: string, ko: string): Promise<void> {
  await ensureTable()
  await sql()`INSERT INTO player_name_ko (name, ko) VALUES (${name}, ${ko}) ON CONFLICT (name) DO UPDATE SET ko = EXCLUDED.ko`
}
