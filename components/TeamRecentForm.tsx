type TeamFixture = {
  fixture: { id: number; date: string; status: { short: string } }
  teams: {
    home: { id: number; name: string; logo: string }
    away: { id: number; name: string; logo: string }
  }
  goals: { home: number | null; away: number | null }
}

function resultColor(teamId: number, fx: TeamFixture) {
  const isHome = fx.teams.home.id === teamId
  const own = isHome ? fx.goals.home : fx.goals.away
  const opp = isHome ? fx.goals.away : fx.goals.home
  if (own === null || opp === null) return "bg-floodlight/15 text-floodlight/60"
  if (own > opp) return "bg-green-500/80 text-pitch-night"
  if (own < opp) return "bg-red-500/70 text-pitch-night"
  return "bg-floodlight/30 text-floodlight"
}

function FormColumn({ teamId, fixtures, excludeFixtureId }: { teamId: number; fixtures: TeamFixture[]; excludeFixtureId: number }) {
  const rows = fixtures.filter((fx) => fx.fixture.id !== excludeFixtureId).slice(0, 5)

  if (rows.length === 0) {
    return <p className="text-floodlight/40 text-xs">최근 경기 정보가 없습니다.</p>
  }

  return (
    <div className="space-y-3">
      {rows.map((fx) => (
        <div key={fx.fixture.id} className="flex items-center gap-2 text-xs">
          <span className="flex-1 text-right truncate text-floodlight/70">{fx.teams.home.name}</span>
          <span className={`shrink-0 px-2 py-0.5 rounded font-data font-medium ${resultColor(teamId, fx)}`}>
            {fx.goals.home ?? "-"} - {fx.goals.away ?? "-"}
          </span>
          <span className="flex-1 truncate text-floodlight/70">{fx.teams.away.name}</span>
        </div>
      ))}
    </div>
  )
}

export default function TeamRecentForm({
  homeTeamId,
  awayTeamId,
  homeFixtures,
  awayFixtures,
  currentFixtureId,
}: {
  homeTeamId: number
  awayTeamId: number
  homeFixtures: TeamFixture[]
  awayFixtures: TeamFixture[]
  currentFixtureId: number
}) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <FormColumn teamId={homeTeamId} fixtures={homeFixtures} excludeFixtureId={currentFixtureId} />
      <FormColumn teamId={awayTeamId} fixtures={awayFixtures} excludeFixtureId={currentFixtureId} />
    </div>
  )
}
