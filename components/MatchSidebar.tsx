import Link from "next/link"
import AdSlot from "@/components/AdSlot"

type SidebarFixture = {
  fixture: { id: number; date: string; status: { short: string } }
  teams: {
    home: { name: string; logo: string }
    away: { name: string; logo: string }
  }
  goals: { home: number | null; away: number | null }
}

type VenueInfo = {
  name: string
  city: string | null
  capacity: number | null
  surface: string | null
  image: string | null
} | null

type Insight = { side: "home" | "away"; text: string }

const FINISHED_CODES = ["FT", "AET", "PEN"]

function HighlightCard({ homeTeam, awayTeam }: { homeTeam: string; awayTeam: string }) {
  const query = encodeURIComponent(`${homeTeam} vs ${awayTeam} highlights`)
  return (
    <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
      <p className="text-sm font-medium mb-1">공식 하이라이트</p>
      <a
        href={`https://www.youtube.com/results?search_query=${query}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-floodlight/40 hover:text-score-amber"
      >
        www.youtube.com에서 하이라이트 검색 →
      </a>
    </div>
  )
}

function VenueCard({ venue }: { venue: VenueInfo }) {
  if (!venue) return null
  return (
    <div className="bg-turf/40 border border-turf-line/40 rounded-md overflow-hidden">
      {venue.image && <img src={venue.image} alt="" className="w-full h-32 object-cover" />}
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <span className="text-sm">📍</span>
          <div>
            <p className="text-sm font-medium">{venue.name}</p>
            {venue.city && <p className="text-xs text-floodlight/40">{venue.city}</p>}
          </div>
        </div>
        {venue.capacity ? (
          <div className="flex justify-between text-xs">
            <span className="text-floodlight/50">수용 능력</span>
            <span className="font-data">{venue.capacity.toLocaleString()}</span>
          </div>
        ) : null}
        {venue.surface ? (
          <div className="flex justify-between text-xs">
            <span className="text-floodlight/50">표면</span>
            <span>{venue.surface === "grass" ? "잔디" : venue.surface}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function RoundFixturesCard({
  leagueName,
  round,
  leagueLogo,
  fixtures,
  currentFixtureId,
}: {
  leagueName: string
  round?: string
  leagueLogo: string
  fixtures: SidebarFixture[]
  currentFixtureId: number
}) {
  if (fixtures.length === 0) return null
  const sorted = [...fixtures].sort(
    (a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
  )

  return (
    <div className="bg-turf/40 border border-turf-line/40 rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-turf-line/40">
        <div>
          <p className="text-sm font-medium">{leagueName}</p>
          {round && <p className="text-xs text-floodlight/40">{round}</p>}
        </div>
        <img src={leagueLogo} alt="" className="w-6 h-6" />
      </div>
      {sorted.map((fx) => {
        const finished = FINISHED_CODES.includes(fx.fixture.status.short)
        const isCurrent = fx.fixture.id === currentFixtureId
        const inner = (
          <div
            className={`flex items-center gap-3 px-4 py-3 border-b border-turf-line/20 last:border-b-0 ${
              isCurrent ? "bg-turf-line/40" : ""
            }`}
          >
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <img src={fx.teams.home.logo} alt="" className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1">{fx.teams.home.name}</span>
                {finished && <span className="font-data font-bold">{fx.goals.home}</span>}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <img src={fx.teams.away.logo} alt="" className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1">{fx.teams.away.name}</span>
                {finished && <span className="font-data font-bold">{fx.goals.away}</span>}
              </div>
            </div>
            <div className="shrink-0 text-xs text-floodlight/40 border-l border-turf-line/40 pl-3 w-16 text-center">
              {finished ? (
                "FT"
              ) : (
                <>
                  {new Date(fx.fixture.date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                  <br />
                  {new Date(fx.fixture.date).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                </>
              )}
            </div>
          </div>
        )
        return isCurrent ? (
          <div key={fx.fixture.id}>{inner}</div>
        ) : (
          <Link key={fx.fixture.id} href={`/matches/${fx.fixture.id}`} className="block hover:bg-turf-line/20">
            {inner}
          </Link>
        )
      })}
    </div>
  )
}

function InsightsCard({
  insights,
  homeLogo,
  awayLogo,
}: {
  insights: Insight[]
  homeLogo: string
  awayLogo: string
}) {
  if (insights.length === 0) return null
  return (
    <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
      <p className="text-center text-sm font-medium mb-4">인사이트</p>
      <div className="space-y-3">
        {insights.map((ins, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <img
              src={ins.side === "home" ? homeLogo : awayLogo}
              alt=""
              className="w-5 h-5 shrink-0 mt-1"
            />
            <p
              className={`flex-1 text-xs leading-relaxed bg-turf-line/30 rounded p-3 border-l-2 ${
                ins.side === "home" ? "border-score-amber" : "border-blue-400"
              }`}
            >
              {ins.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function WhoWinsCard({
  homeLogo,
  awayLogo,
  homePct,
  drawPct,
  awayPct,
}: {
  homeLogo: string
  awayLogo: string
  homePct: string
  drawPct: string
  awayPct: string
}) {
  return (
    <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
      <p className="text-center text-sm font-medium mb-4">누가 이길까요?</p>
      <div className="flex items-center justify-around">
        <div className="flex flex-col items-center gap-1.5">
          <img src={homeLogo} alt="" className="w-9 h-9" />
          <span className="font-data font-bold text-score-amber">{homePct}</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-floodlight/40 text-lg">X</span>
          <span className="font-data text-floodlight/60">{drawPct}</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <img src={awayLogo} alt="" className="w-9 h-9" />
          <span className="font-data font-bold text-floodlight/90">{awayPct}</span>
        </div>
      </div>
      <p className="text-center text-[10px] text-floodlight/30 mt-3">AI 승부 예측 기반</p>
    </div>
  )
}

export default function MatchSidebar({
  homeTeamName,
  awayTeamName,
  homeTeamLogo,
  awayTeamLogo,
  venue,
  leagueName,
  leagueLogo,
  round,
  roundFixtures,
  currentFixtureId,
  insights,
  prediction,
}: {
  homeTeamName: string
  awayTeamName: string
  homeTeamLogo: string
  awayTeamLogo: string
  venue: VenueInfo
  leagueName: string
  leagueLogo: string
  round?: string
  roundFixtures: SidebarFixture[]
  currentFixtureId: number
  insights: Insight[]
  prediction: { home: string; draw: string; away: string } | null
}) {
  return (
    <div className="space-y-4">
      <HighlightCard homeTeam={homeTeamName} awayTeam={awayTeamName} />
      <AdSlot label="사이드바 광고 (예: 300x250)" className="w-full h-64" />
      <VenueCard venue={venue} />
      <RoundFixturesCard
        leagueName={leagueName}
        round={round}
        leagueLogo={leagueLogo}
        fixtures={roundFixtures}
        currentFixtureId={currentFixtureId}
      />
      <InsightsCard insights={insights} homeLogo={homeTeamLogo} awayLogo={awayTeamLogo} />
      {prediction && (
        <WhoWinsCard
          homeLogo={homeTeamLogo}
          awayLogo={awayTeamLogo}
          homePct={prediction.home}
          drawPct={prediction.draw}
          awayPct={prediction.away}
        />
      )}
    </div>
  )
}
