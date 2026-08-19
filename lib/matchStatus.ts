// API-Football의 status.short 코드를 3단계로 분류
export type MatchPhase = "live" | "upcoming" | "finished" | "other"

const LIVE_CODES = ["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]
const UPCOMING_CODES = ["TBD", "NS"]
const FINISHED_CODES = ["FT", "AET", "PEN"]

export function getMatchPhase(statusShort: string): MatchPhase {
  if (LIVE_CODES.includes(statusShort)) return "live"
  if (UPCOMING_CODES.includes(statusShort)) return "upcoming"
  if (FINISHED_CODES.includes(statusShort)) return "finished"
  return "other" // 연기, 취소 등
}