import Link from "next/link"

type TeamFixture = {
  fixture: { id: number; date: string; status: { short: string } }
  teams: {
    home: { id: number; name: string; logo: string }
    away: { id: number; name: string; logo: string }
  }
  league: { name: string; logo: string }
}

function NextMatchColumn({ teamId, fixture }: { teamId: number; fixture: TeamFixture | null }) {
  if (!fixture) {
    return <p className="text-floodlight/40 text-xs text-center">다음 경기 정보가 없습니다.</p>
  }

  const isHome = fixture.teams.home.id === teamId
  const self = isHome ? fixture.teams.home : fixture.teams.away
  const opponent = isHome ? fixture.teams.away : fixture.teams.home
  const dateText = new Date(fixture.fixture.date).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <Link
      href={`/matches/${fixture.fixture.id}`}
      className="flex flex-col items-center gap-2 hover:bg-turf-line/20 transition-colors py-2 px-1"
    >
      <span className="flex items-center gap-1.5 text-[10px] text-floodlight/40">
        <img src={fixture.league.logo} alt="" className="w-3.5 h-3.5" />
        {fixture.league.name}
      </span>
      <div className="flex items-center gap-3">
        <img src={self.logo} alt="" className="w-7 h-7" />
        <span className="font-data text-sm text-score-amber">
          {new Date(fixture.fixture.date).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
        </span>
        <img src={opponent.logo} alt="" className="w-7 h-7" />
      </div>
      <span className="text-xs text-floodlight/60 text-center">{opponent.name}</span>
      <span className="text-[10px] text-floodlight/30">{dateText}</span>
    </Link>
  )
}

export default function NextMatchCard({
  homeTeamId,
  awayTeamId,
  homeNextFixture,
  awayNextFixture,
}: {
  homeTeamId: number
  awayTeamId: number
  homeNextFixture: TeamFixture | null
  awayNextFixture: TeamFixture | null
}) {
  return (
    <div className="grid grid-cols-2 divide-x divide-turf-line/40">
      <NextMatchColumn teamId={homeTeamId} fixture={homeNextFixture} />
      <NextMatchColumn teamId={awayTeamId} fixture={awayNextFixture} />
    </div>
  )
}
