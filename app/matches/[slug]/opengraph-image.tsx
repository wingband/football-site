import { ImageResponse } from "next/og"
import { parseFixtureId } from "@/lib/slug"
import { MOCK_MATCH_DETAIL } from "@/lib/mockData"

export const alt = "경기 스코어 — GoalLine"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// 진행 중인 경기는 스코어가 바뀌니까 10분마다 다시 생성.
// (no-store로 두면 공유될 때마다 API를 때려서 쿼터가 빨리 소모됨)
export const revalidate = 600

const BG = "#0d1f15"
const GOLD = "#f5b942"

const FINISHED_CODES = ["FT", "AET", "PEN"]
const LIVE_CODES = ["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]

type OgFixture = {
  fixture: { date: string; status: { short?: string; elapsed?: number | null } }
  teams: {
    home: { name: string; logo: string }
    away: { name: string; logo: string }
  }
  goals: { home: number | null; away: number | null }
  league: { name: string }
}

async function getFixture(fixtureId: number): Promise<OgFixture | null> {
  if (process.env.USE_MOCK_DATA === "true") {
    return MOCK_MATCH_DETAIL.fixture?.[0] ?? null
  }

  try {
    const res = await fetch(`https://v3.football.api-sports.io/fixtures?id=${fixtureId}`, {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      next: { revalidate: 600 },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.response?.[0] ?? null
  } catch {
    // OG 이미지가 500이 되면 공유 카드에 깨진 이미지가 뜨므로, 실패해도 기본 이미지로 넘어간다
    return null
  }
}

// 스코어 위에 붙는 상태 라벨. 시작 전 경기의 "-  -"를 결과로 오해하지 않게 함
function statusLabel(fx: OgFixture): string {
  const short = fx.fixture.status?.short ?? ""
  if (FINISHED_CODES.includes(short)) return "FULL TIME"
  if (LIVE_CODES.includes(short)) {
    return fx.fixture.status.elapsed ? `LIVE ${fx.fixture.status.elapsed}'` : "LIVE"
  }
  return new Date(fx.fixture.date)
    .toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
    .toUpperCase()
}

function TeamColumn({ name, logo }: { name: string; logo: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: 320,
      }}
    >
      <img src={logo} width={168} height={168} alt="" />
      <div
        style={{
          marginTop: 28,
          fontSize: 34,
          fontWeight: 600,
          color: "rgba(240,244,240,0.92)",
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {name}
      </div>
    </div>
  )
}

function Watermark({ leagueName }: { leagueName: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderTop: "1px solid rgba(240,244,240,0.14)",
        paddingTop: 26,
      }}
    >
      <div style={{ fontSize: 30, color: "rgba(240,244,240,0.55)" }}>{leagueName}</div>
      <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 6, color: GOLD }}>
        GOALLINE
      </div>
    </div>
  )
}

// 경기를 못 찾았을 때 쓰는 기본 이미지 (브랜드만)
function fallbackImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BG,
          fontSize: 76,
          fontWeight: 700,
          letterSpacing: 12,
          color: GOLD,
        }}
      >
        GOALLINE
      </div>
    ),
    { ...size }
  )
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const fixtureId = parseFixtureId(slug)
  if (fixtureId === null) return fallbackImage()

  const match = await getFixture(fixtureId)
  if (!match) return fallbackImage()

  // 시작 전 경기는 "- - -"가 깨진 스코어처럼 보여서 VS로 대체
  const hasScore = match.goals.home !== null && match.goals.away !== null

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          // 사이트 스코어보드와 같은 상단 골드 글로우
          backgroundImage:
            "radial-gradient(120% 90% at 50% -10%, rgba(245,185,66,0.16), rgba(13,31,21,0) 60%)",
          padding: "56px 72px 44px 72px",
        }}
      >
        {/* 홈 로고 + 스코어 + 원정 로고 */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TeamColumn name={match.teams.home.name} logo={match.teams.home.logo} />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: 300,
            }}
          >
            <div
              style={{
                fontSize: 26,
                letterSpacing: 5,
                color: "rgba(240,244,240,0.45)",
                marginBottom: 14,
              }}
            >
              {statusLabel(match)}
            </div>
            {hasScore ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: 132,
                  fontWeight: 700,
                  color: GOLD,
                  lineHeight: 1,
                }}
              >
                <span>{match.goals.home}</span>
                <span style={{ margin: "0 22px", color: "rgba(240,244,240,0.3)" }}>-</span>
                <span>{match.goals.away}</span>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  fontSize: 104,
                  fontWeight: 700,
                  letterSpacing: 6,
                  color: GOLD,
                  lineHeight: 1,
                }}
              >
                VS
              </div>
            )}
          </div>

          <TeamColumn name={match.teams.away.name} logo={match.teams.away.logo} />
        </div>

        <Watermark leagueName={match.league.name} />
      </div>
    ),
    { ...size }
  )
}
