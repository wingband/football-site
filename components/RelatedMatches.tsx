import Link from "next/link"
import { matchHref } from "@/lib/slug"

type RelatedFixture = {
  fixture: { id: number; date: string; status: { short: string } }
  teams: {
    home: { name: string; logo: string }
    away: { name: string; logo: string }
  }
  goals: { home: number | null; away: number | null }
}

const FINISHED_CODES = ["FT", "AET", "PEN"]
const MAX_CARDS = 5

// 경기 상세 페이지 맨 아래에 같은 라운드의 다른 경기를 카드로 보여준다.
// 사이드바의 RoundFixturesCard와 같은 데이터를 쓰지만, 본문을 다 읽고 내려온
// 독자가 다음에 볼 경기를 찾도록 하는 자리라서 카드 그리드로 따로 배치
export default function RelatedMatches({
  fixtures,
  currentFixtureId,
  leagueName,
  leagueLogo,
  round,
}: {
  fixtures: RelatedFixture[]
  currentFixtureId: number
  leagueName: string
  leagueLogo: string
  round?: string
}) {
  const others = fixtures
    .filter((fx) => fx.fixture.id !== currentFixtureId)
    .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())
    .slice(0, MAX_CARDS)

  if (others.length === 0) return null

  return (
    <section className="mt-10 pt-8 border-t border-turf-line/40">
      <div className="flex items-center gap-2 mb-4">
        <img src={leagueLogo} alt="" className="w-5 h-5 shrink-0" />
        <h2 className="font-display uppercase text-sm tracking-wide text-floodlight/90">
          같은 리그 다른 경기
        </h2>
        {round && <span className="text-xs text-floodlight/40 truncate">{round}</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {others.map((fx) => {
          const finished = FINISHED_CODES.includes(fx.fixture.status.short)
          const kickoff = new Date(fx.fixture.date)
          return (
            <Link
              key={fx.fixture.id}
              href={matchHref(fx)}
              className="block bg-turf/40 border border-turf-line/40 rounded-md px-4 py-3 hover:border-score-amber/60 hover:bg-turf/60 transition-colors group"
            >
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] uppercase text-floodlight/40 truncate">{leagueName}</span>
                <span className={`text-[10px] font-data shrink-0 ${finished ? "text-floodlight/40" : "text-score-amber"}`}>
                  {finished
                    ? "종료"
                    : `${kickoff.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })} ${kickoff.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <img src={fx.teams.home.logo} alt="" className="w-4 h-4 shrink-0" />
                  <span className="text-sm truncate flex-1 group-hover:text-score-amber transition-colors">
                    {fx.teams.home.name}
                  </span>
                  {finished && (
                    <span className="text-sm font-data font-bold shrink-0">{fx.goals.home ?? "-"}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <img src={fx.teams.away.logo} alt="" className="w-4 h-4 shrink-0" />
                  <span className="text-sm truncate flex-1 group-hover:text-score-amber transition-colors">
                    {fx.teams.away.name}
                  </span>
                  {finished && (
                    <span className="text-sm font-data font-bold shrink-0">{fx.goals.away ?? "-"}</span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
