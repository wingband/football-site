// ── 5대 리그(PL/La Liga/Bundesliga/Serie A/Ligue 1) 1부 현역 한국 선수 ──────────────────
// API-Football 선수 ID (2026년 8월 기준)
//
// ID 확인 방법: https://v3.football.api-sports.io/players?search=이름&season=2025
// ※ 이적 시즌마다 수동 업데이트 필요
//
// 현재 5대리그 등록 선수 (2025-26 시즌):
//   황희찬  — Wolverhampton (Premier League)
//   이강인  — Atlético Madrid (La Liga)
//   김민재  — Bayern München (Bundesliga)
//   이재성  — Mainz 05 (Bundesliga)
//   정우영  — Union Berlin (Bundesliga)
//   옌스카스트로프 — Borussia Mönchengladbach (Bundesliga)
//   손흥민  — LAFC (MLS, 별도 표시)

export const KOREAN_PLAYERS_ABROAD = [
  // ── Premier League ─────────────────────────────────────
  { id: 24888, name: "황희찬",        league: "Premier League" },  // Wolverhampton

  // ── La Liga ────────────────────────────────────────────
  { id: 927,   name: "이강인",        league: "La Liga" },         // Atlético Madrid

  // ── Bundesliga ─────────────────────────────────────────
  { id: 2897,  name: "김민재",        league: "Bundesliga" },      // Bayern München
  { id: 47104, name: "이재성",        league: "Bundesliga" },      // Mainz 05  ← API-Football ID 확인 필요
  { id: 47429, name: "정우영",        league: "Bundesliga" },      // Union Berlin ← API-Football ID 확인 필요
  { id: 342853, name: "옌스 카스트로프", league: "Bundesliga" },  // Borussia Mönchengladbach ← 확인 필요

  // ── MLS (사이트 차별화 포인트로 항상 표시) ────────────────
  { id: 186,   name: "손흥민",        league: "Major League Soccer" }, // LAFC
]

// ※ ID가 맞지 않아 데이터가 안 나오는 선수는 Vercel 로그에서 확인 후 수정:
// https://v3.football.api-sports.io/players?search=Jae-Sung+Lee&season=2025
// https://v3.football.api-sports.io/players?search=Woo-Yeong+Jeong&season=2025
// https://v3.football.api-sports.io/players?search=Jens+Castrop&season=2025
