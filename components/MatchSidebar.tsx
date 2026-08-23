import type * as React from "react"
import Link from "next/link"
import AdSlot from "@/components/AdSlot"
import PlayerAvatar from "@/components/PlayerAvatar"

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

type InjuredPlayer = {
  player: { id: number; name: string; photo: string; type: string; reason: string }
  team: { id: number; name: string; logo: string }
}

type OddsData = {
  home: string | null
  draw: string | null
  away: string | null
  over25: string | null
  under25: string | null
  bttsYes: string | null
} | null

const FINISHED_CODES = ["FT", "AET", "PEN"]

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

function InjuriesCard({
  homeTeamName, awayTeamName, homeTeamLogo, awayTeamLogo, homeInjuries, awayInjuries,
}: {
  homeTeamName: string; awayTeamName: string; homeTeamLogo: string; awayTeamLogo: string
  homeInjuries: InjuredPlayer[]; awayInjuries: InjuredPlayer[]
}) {
  if (homeInjuries.length === 0 && awayInjuries.length === 0) return null
  return (
    <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
      <p className="text-sm font-medium mb-3">⚕️ 부상 / 결장</p>
      {[{ team: homeTeamName, logo: homeTeamLogo, players: homeInjuries },
        { team: awayTeamName, logo: awayTeamLogo, players: awayInjuries }].map(({ team, logo, players }) =>
        players.length > 0 ? (
          <div key={team} className="mb-3 last:mb-0">
            <div className="flex items-center gap-1.5 mb-2">
              <img src={logo} alt="" className="w-4 h-4" />
              <p className="text-xs text-floodlight/50">{team}</p>
            </div>
            <div className="space-y-1.5">
              {players.map((inj) => (
                <div key={inj.player.id} className="flex items-center gap-2">
                  <PlayerAvatar
                    src={inj.player.photo || `https://media.api-sports.io/football/players/${inj.player.id}.png`}
                    alt={inj.player.name}
                    className="w-6 h-6 rounded-full object-cover bg-turf-line text-[8px] shrink-0"
                  />
                  <span className="text-xs flex-1 truncate">{inj.player.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                    inj.player.type === "Missing Fixture" ? "bg-red-900/40 text-red-400" : "bg-orange-900/40 text-orange-400"
                  }`}>
                    {inj.player.type === "Missing Fixture" ? "결장" : "의심"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null
      )}
    </div>
  )
}

function OddsCard({
  homeTeamName, awayTeamName, homeTeamLogo, awayTeamLogo, odds,
}: {
  homeTeamName: string; awayTeamName: string; homeTeamLogo: string; awayTeamLogo: string
  odds: OddsData
}) {
  if (!odds?.home && !odds?.draw && !odds?.away) return null
  const nums = [Number(odds.home), Number(odds.draw), Number(odds.away)].filter(Boolean)
  const minOdd = Math.min(...nums)
  return (
    <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium">배당률</p>
        <span className="text-[10px] text-floodlight/20">Bet365</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[{ label: homeTeamName, logo: homeTeamLogo, odd: odds.home },
          { label: "무", logo: null, odd: odds.draw },
          { label: awayTeamName, logo: awayTeamLogo, odd: odds.away }].map(({ label, logo, odd }) => (
          <div key={label} className={`flex flex-col items-center gap-1 py-2 px-1 rounded border ${
            odd && Number(odd) === minOdd ? "border-score-amber bg-score-amber/10" : "border-turf-line/30 bg-turf/20"
          }`}>
            {logo && <img src={logo} alt="" className="w-5 h-5" />}
            <span className="text-[10px] text-floodlight/50 truncate w-full text-center">{label}</span>
            <span className={`font-data font-bold text-sm ${odd && Number(odd) === minOdd ? "text-score-amber" : "text-floodlight/80"}`}>
              {odd ?? "–"}
            </span>
          </div>
        ))}
      </div>
      {(odds.over25 || odds.under25 || odds.bttsYes) && (
        <div className="border-t border-turf-line/30 pt-2 space-y-1.5">
          {odds.over25 && <div className="flex justify-between text-xs"><span className="text-floodlight/50">Over 2.5</span><span className="font-data font-bold">{odds.over25}</span></div>}
          {odds.under25 && <div className="flex justify-between text-xs"><span className="text-floodlight/50">Under 2.5</span><span className="font-data font-bold">{odds.under25}</span></div>}
          {odds.bttsYes && <div className="flex justify-between text-xs"><span className="text-floodlight/50">양팀득점 (BTTS)</span><span className="font-data font-bold">{odds.bttsYes}</span></div>}
        </div>
      )}
      <p className="text-[9px] text-floodlight/15 mt-2 text-center">배당률은 참고용입니다. 도박은 본인 책임.</p>
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
  homeInjuries = [],
  awayInjuries = [],
  odds = null,
  children,
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
  homeInjuries?: InjuredPlayer[]
  awayInjuries?: InjuredPlayer[]
  odds?: OddsData
  children?: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <OddsCard
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        homeTeamLogo={homeTeamLogo}
        awayTeamLogo={awayTeamLogo}
        odds={odds}
      />
      <InjuriesCard
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        homeTeamLogo={homeTeamLogo}
        awayTeamLogo={awayTeamLogo}
        homeInjuries={homeInjuries}
        awayInjuries={awayInjuries}
      />
      <AdSlot label="사이드바 광고 (예: 300x250)" className="w-full h-64" />
      <VenueCard venue={venue} />
      {children}
      <InsightsCard insights={insights} homeLogo={homeTeamLogo} awayLogo={awayTeamLogo} />
      <RoundFixturesCard
        leagueName={leagueName}
        round={round}
        leagueLogo={leagueLogo}
        fixtures={roundFixtures}
        currentFixtureId={currentFixtureId}
      />
    </div>
  )
}
