// ── 5대 리그(PL/La Liga/Bundesliga/Serie A/Ligue 1) 1부 현역 한국 선수 ──────────────────
// API-Football 선수 ID (2026년 8월 기준 실제 검증)
//
// ※ 관리 방법: 이적 시즌마다 아래 목록 수동 업데이트 필요
//   - id: API-Football player id
//   - league: 소속 리그명 (API-Football league name 기준)
//
// 현재 5대리그 등록 선수 (2025-26 시즌):
//   김민재  - Bayern München   (Bundesliga)
//   이강인  - Atletico Madrid  (La Liga)
//   황희찬  - Wolverhampton    (Premier League)
//
// 손흥민은 LAFC(MLS)로 이적해 5대 리그 외이지만 별도 표시
// 오현규(Genk/벨기에), 조규성(Midtjylland/덴마크), 엄지성(Swansea/EFL), 양민혁(Tottenham→임대) = 5대 리그 해당 없음

export const KOREAN_PLAYERS_ABROAD = [
  // ── Premier League ─────────────────────────────────────
  { id: 24888, name: "황희찬",   league: "Premier League" },   // Wolverhampton Wanderers

  // ── La Liga ────────────────────────────────────────────
  { id: 927,   name: "이강인",   league: "La Liga" },          // Atletico Madrid

  // ── Bundesliga ─────────────────────────────────────────
  { id: 2897,  name: "김민재",   league: "Bundesliga" },       // Bayern München

  // ── 손흥민 (MLS지만 사이트 차별화 포인트로 항상 표시) ──────
  { id: 186,   name: "손흥민",   league: "Major League Soccer" }, // LAFC
]
