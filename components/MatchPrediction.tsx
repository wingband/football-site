"use client"

import { useState, useEffect } from "react"
import { useUser, SignInButton } from "@clerk/nextjs"

type PredictionResult = {
  predictedHomeScore: number
  predictedAwayScore: number
  actualHomeScore: number | null
  actualAwayScore: number | null
  points: number | null
  settled: boolean
} | null

export default function MatchPrediction({
  matchId,
  homeTeam,
  awayTeam,
  kickoffAt,
  isStarted,
}: {
  matchId: number
  homeTeam: string
  awayTeam: string
  kickoffAt: string
  isStarted: boolean
}) {
  const { isSignedIn } = useUser()
  const [existing, setExisting] = useState<PredictionResult>(null)
  const [loaded, setLoaded] = useState(false)
  const [homeScore, setHomeScore] = useState("")
  const [awayScore, setAwayScore] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!isSignedIn) {
      setLoaded(true)
      return
    }
    fetch(`/api/predictions?matchId=${matchId}`)
      .then((r) => r.json())
      .then((data) => {
        setExisting(data.prediction)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [matchId, isSignedIn])

  async function submit() {
    const h = parseInt(homeScore)
    const a = parseInt(awayScore)
    if (Number.isNaN(h) || Number.isNaN(a) || h < 0 || a < 0) {
      setError("스코어를 정확히 입력해주세요")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          homeTeam,
          awayTeam,
          predictedHomeScore: h,
          predictedAwayScore: a,
          kickoffAt,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "예측 제출에 실패했습니다")
        return
      }
      setExisting({
        predictedHomeScore: h,
        predictedAwayScore: a,
        actualHomeScore: null,
        actualAwayScore: null,
        points: null,
        settled: false,
      })
    } catch {
      setError("예측 제출에 실패했습니다")
    } finally {
      setSubmitting(false)
    }
  }

  if (!loaded) return null

  // 비로그인 — 댓글 컴포넌트와 동일한 유도 패턴
  if (!isSignedIn) {
    return (
      <div className="bg-turf/40 border border-turf-line/50 rounded p-4">
        <p className="text-sm font-semibold text-floodlight mb-3">🔮 스코어 예측</p>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-floodlight/40">예측하려면 로그인이 필요합니다</p>
          <SignInButton mode="modal">
            <button className="w-full text-xs px-4 py-2 bg-score-amber text-pitch-night font-bold rounded hover:bg-score-amber/80 transition-colors whitespace-nowrap">
              로그인하고 예측하기
            </button>
          </SignInButton>
        </div>
      </div>
    )
  }

  // 경기 종료 + 정산 완료 — 결과 표시
  if (existing?.settled) {
    const won = (existing.points ?? 0) > 0
    return (
      <div className="bg-turf/40 border border-turf-line/50 rounded p-4">
        <p className="text-sm font-semibold text-floodlight mb-2">🔮 스코어 예측</p>
        <p className="text-xs text-floodlight/60">
          내 예측: {existing.predictedHomeScore} - {existing.predictedAwayScore}
        </p>
        <p className={`text-sm font-bold mt-1 ${won ? "text-score-amber" : "text-floodlight/40"}`}>
          {existing.points === 3 ? "🎯 정확히 적중! +3점" : existing.points === 1 ? "결과 적중 +1점" : "아쉽네요, 0점"}
        </p>
      </div>
    )
  }

  // 이미 예측했지만 아직 경기 전/진행 중(미정산)
  if (existing) {
    return (
      <div className="bg-turf/40 border border-turf-line/50 rounded p-4">
        <p className="text-sm font-semibold text-floodlight mb-2">🔮 스코어 예측</p>
        <p className="text-xs text-floodlight/60">
          예측완료 ✓ {existing.predictedHomeScore} - {existing.predictedAwayScore}
        </p>
        <p className="text-[11px] text-floodlight/30 mt-1">경기 종료 후 결과가 집계됩니다</p>
      </div>
    )
  }

  // 경기가 이미 시작됨 + 예측 안 함 — 마감
  if (isStarted) {
    return (
      <div className="bg-turf/40 border border-turf-line/50 rounded p-4">
        <p className="text-sm font-semibold text-floodlight mb-2">🔮 스코어 예측</p>
        <p className="text-xs text-floodlight/40">예측 마감된 경기입니다</p>
      </div>
    )
  }

  // 예측 입력 폼
  return (
    <div className="bg-turf/40 border border-turf-line/50 rounded p-4">
      <p className="text-sm font-semibold text-floodlight mb-3">🔮 스코어 예측</p>
      <div className="flex items-center justify-center gap-3">
        <span className="text-xs text-floodlight/60 truncate max-w-20 text-right">{homeTeam}</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={homeScore}
          onChange={(e) => setHomeScore(e.target.value)}
          className="w-12 text-center bg-pitch-night border border-turf-line rounded py-1.5 text-floodlight text-sm focus:outline-none focus:border-score-amber"
        />
        <span className="text-floodlight/30">-</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={awayScore}
          onChange={(e) => setAwayScore(e.target.value)}
          className="w-12 text-center bg-pitch-night border border-turf-line rounded py-1.5 text-floodlight text-sm focus:outline-none focus:border-score-amber"
        />
        <span className="text-xs text-floodlight/60 truncate max-w-20">{awayTeam}</span>
      </div>
      {error && <p className="text-xs text-red-400 mt-2 text-center">{error}</p>}
      <button
        onClick={submit}
        disabled={submitting}
        className="w-full mt-3 text-xs px-4 py-2 bg-score-amber text-pitch-night font-bold rounded hover:bg-score-amber/80 transition-colors disabled:opacity-50"
      >
        {submitting ? "제출 중..." : "예측 제출"}
      </button>
      <p className="text-[11px] text-floodlight/30 mt-2 text-center">
        정확히 맞히면 3점, 승/무/패만 맞혀도 1점
      </p>
    </div>
  )
}
