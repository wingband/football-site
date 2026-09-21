import type { Metadata } from "next"
import { getLeaderboard } from "@/lib/predictions"

export const metadata: Metadata = {
  title: "예측 랭킹",
  description: "GoalLine 스코어 예측 게임 순위표. 정확히 맞히면 3점, 승/무/패만 맞혀도 1점을 획득합니다.",
}

// 랭킹은 자주 안 바뀌어도 괜찮은 정보라 5분 캐시
export const revalidate = 300

const MEDALS = ["🥇", "🥈", "🥉"]

export default async function PredictionsPage() {
  const leaderboard = await getLeaderboard(50)

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-2xl mx-auto px-4 pb-16">
        <div className="pt-8 pb-6 border-b border-turf-line/40">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🔮</span>
            <h1 className="font-display uppercase text-2xl text-score-amber">예측 랭킹</h1>
          </div>
          <p className="text-sm text-floodlight/50">
            스코어를 정확히 맞히면 3점, 승/무/패만 맞혀도 1점을 드립니다.
          </p>
        </div>

        {leaderboard.length === 0 ? (
          <div className="mt-8 text-center text-floodlight/40 text-sm py-12">
            아직 정산된 예측이 없습니다. 경기 상세 페이지에서 첫 예측을 남겨보세요!
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {leaderboard.map((row, i) => (
              <div
                key={row.userId}
                className={`flex items-center gap-3 px-4 py-3 rounded ${
                  i < 3 ? "bg-turf/60 border border-score-amber/30" : "bg-turf/30"
                }`}
              >
                <span className="w-8 text-center text-sm font-data text-floodlight/50 shrink-0">
                  {MEDALS[i] ?? i + 1}
                </span>
                <span className="flex-1 text-sm font-medium truncate">{row.nickname}</span>
                <span className="text-[11px] text-floodlight/40 shrink-0">
                  {row.totalPredictions}전 {row.exactCount}적중
                </span>
                <span className="text-sm font-bold text-score-amber shrink-0 w-14 text-right">
                  {row.totalPoints}점
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
