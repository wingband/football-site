// ── 한국인 해외파 트래커 선수 목록 ─────────────────────────────────────────────
// 선수 메타데이터(이름/팀/리그)는 여기에 하드코딩 → ID 오류가 나도 표시 보장
// API-Football ID는 스탯(득점/도움/평점) 조회에만 사용
//
// ID 확인: https://v3.football.api-sports.io/players?search=이름&season=2025
// 이적 시마다 수동 업데이트 필요

export type KoreanPlayer = {
  id: number          // API-Football player ID
  name: string        // 한국어 이름
  teamName: string    // 현재 소속팀 (확정 정보)
  teamId: number       // API-Football team ID — 팀 상세 페이지(/teams/[id]) 링크 및
                        // 선수 상세 페이지에서 새 팀 클럽 스탯이 아직 API에 없을 때
                        // 0경기 폴백 스탯을 만드는 데 사용 (2026-09-21 추가,
                        // 김지수 팀 링크가 team.id=0으로 나가 "팀 정보를 찾을 수
                        // 없습니다"가 뜨던 문제 계기)
  teamLogo: string    // 팀 로고 URL
  league: string      // 리그명
  leagueLogo: string  // 리그 로고 URL
  tier: 1 | 2        // 1 = 5대리그 1부, 2 = Championship/임대 등
}

const CDN = "https://media.api-sports.io/football"

export const KOREAN_PLAYERS_ABROAD: KoreanPlayer[] = [
  // ── 🇬🇧 Premier League ─────────────────────────────────────────
  {
    id: 24888,
    teamId: 174,
    name: "황희찬",
    // 2026-09-02 울버햄튼 → 샬케04 임대 이적 확정 (완전 영입 옵션 포함), 등번호 7번.
    // 샬케는 25/26시즌 2.분데스리가 우승으로 분데스리가(1부) 승격.
    // (2026-09-22) teamName/teamLogo API-Football 실제 값으로 확인 후 교체 완료.
    teamName: "FC Schalke 04",
    teamLogo: `${CDN}/teams/174.png`,
    league: "Bundesliga",
    leagueLogo: `${CDN}/leagues/78.png`,
    tier: 1,
  },

  // ── 🇪🇸 La Liga ────────────────────────────────────────────────
  {
    id: 927,
    teamId: 530,
    name: "이강인",
    teamName: "Atlético Madrid",
    teamLogo: `${CDN}/teams/530.png`,
    league: "La Liga",
    leagueLogo: `${CDN}/leagues/140.png`,
    tier: 1,
  },

  // ── 🇩🇪 Bundesliga ─────────────────────────────────────────────
  {
    id: 2897,
    teamId: 157,
    name: "김민재",
    teamName: "Bayern München",
    teamLogo: `${CDN}/teams/157.png`,
    league: "Bundesliga",
    leagueLogo: `${CDN}/leagues/78.png`,
    tier: 1,
  },
  {
    id: 2906,    // ✅ 확인됨
    teamId: 164,
    name: "이재성",
    teamName: "FSV Mainz 05",
    teamLogo: `${CDN}/teams/164.png`,
    league: "Bundesliga",
    leagueLogo: `${CDN}/leagues/78.png`,
    tier: 1,
  },
  {
    id: 512,     // ✅ 확인됨
    teamId: 182,
    name: "정우영",
    teamName: "Union Berlin",
    teamLogo: `${CDN}/teams/182.png`,
    league: "Bundesliga",
    leagueLogo: `${CDN}/leagues/78.png`,
    tier: 1,
  },
  {
    id: 280358,  // ✅ 확인됨
    teamId: 163,
    name: "옌스 카스트로프",
    // (2026-09-22) 아포스트로피 표기("M'gladbach")는 normalizeTeamName이 제거하는
    // 대상이 아니라서 API 실제 명칭과 매칭이 안 됐음 — 정식 명칭으로 교체
    teamName: "Borussia Mönchengladbach",
    teamLogo: `${CDN}/teams/163.png`,
    league: "Bundesliga",
    leagueLogo: `${CDN}/leagues/78.png`,
    tier: 1,
  },

  // ── 🇬🇧 Championship (5대리그 아니지만 주목 선수) ──────────────
  {
    id: 357286,  // ✅ 확인됨
    teamId: 75,
    name: "배준호",
    teamName: "Stoke City",
    teamLogo: `${CDN}/teams/75.png`,
    league: "Championship",
    leagueLogo: `${CDN}/leagues/40.png`,
    tier: 2,
  },
  {
    id: 2909,    // ✅ 확인됨
    teamId: 54,
    name: "백승호",
    teamName: "Birmingham",
    teamLogo: `${CDN}/teams/54.png`,
    league: "Championship",
    leagueLogo: `${CDN}/leagues/40.png`,
    tier: 2,
  },
  {
    id: 237050,  // ✅ 확인됨
    teamId: 76,
    name: "엄지성",
    teamName: "Swansea",
    teamLogo: `${CDN}/teams/76.png`,
    league: "Championship",
    leagueLogo: `${CDN}/leagues/40.png`,
    tier: 2,
  },
  {
    id: 423708,  // ✅ 확인됨 (2026-08-11 Portsmouth 임대 종료 → KVC Westerlo 재임대, Tottenham 소속)
    teamId: 791,
    name: "양민혁",
    // (2026-09-22) teamName/teamLogo API-Football 실제 값으로 확인 후 교체 완료.
    teamName: "Westerlo",
    teamLogo: `${CDN}/teams/791.png`,
    league: "Belgian Pro League",
    leagueLogo: `${CDN}/leagues/144.png`,
    tier: 2,
  },

  // ── 🇬🇧 Premier League 복귀 (2026-06-30 카이저슬라우테른 임대 종료) ──────
  {
    id: 356237,  // ✅ 확인됨 (2026-06-30 Kaiserslautern 임대 종료 → Brentford 복귀)
    teamId: 55,
    name: "김지수",
    // (2026-09-22) teamLogo API-Football 실제 값으로 확인 후 교체 완료.
    teamName: "Brentford",
    teamLogo: `${CDN}/teams/55.png`,
    league: "Premier League",
    leagueLogo: `${CDN}/leagues/39.png`,
    tier: 1,
  },

  // ── 🇧🇪 벨기에 Pro League ──────────────────────────────────────
  {
    id: 26519,   // ✅ 확인됨 (Mainz 소속 → Gent 임대)
    teamId: 631,
    name: "홍현석",
    teamName: "Gent",
    teamLogo: `${CDN}/teams/631.png`,
    league: "Belgian Pro League",
    leagueLogo: `${CDN}/leagues/144.png`,
    tier: 2,
  },

  // ── 🏴󠁧󠁢󠁥󠁮󠁧󠁿 손흥민 (MLS — 사이트 차별화 포인트) ─────────────────
  {
    id: 186,
    teamId: 1616,
    name: "손흥민",
    teamName: "Los Angeles FC",
    teamLogo: `${CDN}/teams/1616.png`,
    league: "MLS",
    leagueLogo: `${CDN}/leagues/253.png`,
    tier: 2,
  },
]
