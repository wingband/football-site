import { ImageResponse } from "next/og"
import { koTeam, type PlayerWeek, type WeeklyMatch } from "@/lib/koreanWeekly"

// 주간 해외파 칼럼 맨 위에 들어가는 "평점 TOP 5" 카드 이미지 (2026-10-11).
// 사이트가 자기 데이터로 직접 그리는 이미지라 저작권 문제가 없고, 칼럼 공유 시
// 카카오톡/커뮤니티 미리보기 이미지로도 쓰인다(app/columns/[slug]/page.tsx).
// 선수 사진·구단 로고는 넣지 않는다 — 외부 이미지 로딩 실패로 카드 전체가
// 깨지는 걸 막고, 권리 관계도 깔끔하게 유지하기 위함.

const W = 1200
const H = 630
const BG = "#0b1210"
const PANEL = "#13241a"
const LINE = "#24492e"
const GOLD = "#f5b942"
const TEXT = "#eaf6e9"
const MUTED = "#8fa392"

export type CardRow = {
  name: string
  team: string
  line: string // "vs 엘버스베르크 · 1:0 승 · 78분"
  points: string // "1골 1도움" 또는 ""
  rating: number
}

function resultKo(m: WeeklyMatch) {
  return m.result === "W" ? "승" : m.result === "L" ? "패" : m.result === "D" ? "무" : ""
}

// 선수별 이번 주 최고 평점 경기 1개씩 → 평점순 상위 5명
export function pickTopRows(weeks: PlayerWeek[], limit = 5): CardRow[] {
  const best: { w: PlayerWeek; m: WeeklyMatch }[] = []
  for (const w of weeks) {
    const rated = w.recent.filter((m) => m.played && m.rating !== null)
    if (!rated.length) continue
    const top = rated.sort((a, b) => b.rating! - a.rating! || b.goals + b.assists - a.goals - a.assists)[0]
    best.push({ w, m: top })
  }
  return best
    .sort((a, b) => b.m.rating! - a.m.rating! || b.m.goals + b.m.assists - a.m.goals - a.m.assists)
    .slice(0, limit)
    .map(({ w, m }) => {
      const my = m.isHome ? m.homeScore : m.awayScore
      const opp = m.isHome ? m.awayScore : m.homeScore
      const score = my !== null && opp !== null ? `${my}:${opp} ${resultKo(m)}`.trim() : ""
      const pts = [m.goals ? `${m.goals}골` : "", m.assists ? `${m.assists}도움` : ""].filter(Boolean).join(" ")
      return {
        name: w.player.name,
        team: w.teamNameKo,
        line: [`vs ${koTeam(m.opponentName)}`, score, `${m.minutes}분`].filter(Boolean).join(" · "),
        points: pts,
        rating: m.rating!,
      }
    })
}

function ratingColor(r: number) {
  if (r >= 7.5) return "#6ee7a8"
  if (r >= 6.8) return GOLD
  return TEXT
}

// 한글이 들어간 글자만 골라 Noto Sans KR을 받아온다 (Google Fonts의 text= 서브셋).
// 실패하면 next/og의 기본 동적 폰트 로딩에 맡긴다.
async function loadKoreanFont(text: string, weight: 400 | 700): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}&text=${encodeURIComponent(text)}`)
    ).text()
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1]
    if (!url) return null
    const res = await fetch(url)
    return res.ok ? await res.arrayBuffer() : null
  } catch {
    return null
  }
}

export async function renderWeeklyCard(
  rows: CardRow[],
  periodLabel: string,
  fontOverride?: { regular: ArrayBuffer; bold: ArrayBuffer }
): Promise<ArrayBuffer> {
  const title = `이번 주 해외파 평점 TOP ${rows.length}`
  const allText = [title, periodLabel, "GOALLINE 주간 해외파", "goalline.me/korean-players", "경기 데이터 평점 기준 · 선수별 이번 주 최고 경기",
    ...rows.flatMap((r) => [r.name, r.team, r.line, r.points, r.rating.toFixed(1)]), "0123456789"].join("")

  const [regular, bold] = fontOverride
    ? [fontOverride.regular, fontOverride.bold]
    : await Promise.all([loadKoreanFont(allText, 400), loadKoreanFont(allText, 700)])
  const fonts = [
    ...(regular ? [{ name: "NotoKR", data: regular, weight: 400 as const, style: "normal" as const }] : []),
    ...(bold ? [{ name: "NotoKR", data: bold, weight: 700 as const, style: "normal" as const }] : []),
  ]

  const rowH = rows.length > 4 ? 72 : 88

  const res = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", backgroundColor: BG, padding: "34px 56px", fontFamily: "NotoKR, sans-serif", color: TEXT }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 22, color: GOLD, fontWeight: 700, letterSpacing: "0.08em" }}>GOALLINE 주간 해외파</div>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 700, marginTop: 4 }}>{title}</div>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: MUTED }}>{periodLabel}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 18, flex: 1 }}>
          {rows.map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                height: rowH,
                padding: "0 24px",
                marginBottom: 7,
                backgroundColor: i === 0 ? "#1d3324" : PANEL,
                border: `2px solid ${i === 0 ? GOLD : LINE}`,
                borderRadius: 10,
              }}
            >
              <div style={{ display: "flex", width: 52, fontSize: 34, fontWeight: 700, color: i === 0 ? GOLD : MUTED }}>{i + 1}</div>
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline" }}>
                  <span style={{ fontSize: 30, fontWeight: 700 }}>{r.name}</span>
                  <span style={{ fontSize: 22, color: MUTED, marginLeft: 14 }}>{r.team}</span>
                  {r.points && <span style={{ fontSize: 22, color: "#6ee7a8", marginLeft: 14, fontWeight: 700 }}>{r.points}</span>}
                </div>
                <div style={{ display: "flex", fontSize: 20, color: MUTED, marginTop: 2 }}>{r.line}</div>
              </div>
              <div style={{ display: "flex", fontSize: 42, fontWeight: 700, color: ratingColor(r.rating) }}>{r.rating.toFixed(1)}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 19, color: MUTED, marginTop: 4 }}>
          <span>경기 데이터 평점 기준 · 선수별 이번 주 최고 경기</span>
          <span style={{ color: GOLD }}>goalline.me/korean-players</span>
        </div>
      </div>
    ),
    { width: W, height: H, ...(fonts.length ? { fonts } : {}) }
  )
  return await res.arrayBuffer()
}

// "10월 5일 ~ 10월 11일" (한국 시간, 오늘 포함 최근 7일)
export function periodLabel(now = new Date()): string {
  const fmt = (d: Date) => d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" })
  return `${fmt(new Date(now.getTime() - 6 * 86400_000))} ~ ${fmt(now)}`
}
