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
    name: "황희찬",
    teamName: "Wolverhampton",
    teamLogo: `${CDN}/teams/39.png`,
    league: "Premier League",
    leagueLogo: `${CDN}/leagues/39.png`,
    tier: 1,
  },

  // ── 🇪🇸 La Liga ────────────────────────────────────────────────
  {
    id: 927,
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
    name: "김민재",
    teamName: "Bayern München",
    teamLogo: `${CDN}/teams/157.png`,
    league: "Bundesliga",
    leagueLogo: `${CDN}/leagues/78.png`,
    tier: 1,
  },
  {
    id: 2906,    // ✅ 확인됨
    name: "이재성",
    teamName: "Mainz 05",
    teamLogo: `${CDN}/teams/1038.png`,
    league: "Bundesliga",
    leagueLogo: `${CDN}/leagues/78.png`,
    tier: 1,
  },
  {
    id: 512,     // ✅ 확인됨
    name: "정우영",
    teamName: "Union Berlin",
    teamLogo: `${CDN}/teams/173.png`,
    league: "Bundesliga",
    leagueLogo: `${CDN}/leagues/78.png`,
    tier: 1,
  },
  {
    id: 280358,  // ✅ 확인됨
    name: "옌스 카스트로프",
    teamName: "Borussia M'gladbach",
    teamLogo: `${CDN}/teams/163.png`,
    league: "Bundesliga",
    leagueLogo: `${CDN}/leagues/78.png`,
    tier: 1,
  },

  // ── 🇬🇧 Championship (5대리그 아니지만 주목 선수) ──────────────
  {
    id: 357286,  // ✅ 확인됨
    name: "배준호",
    teamName: "Stoke City",
    teamLogo: `${CDN}/teams/70.png`,
    league: "Championship",
    leagueLogo: `${CDN}/leagues/40.png`,
    tier: 2,
  },
  {
    id: 2909,    // ✅ 확인됨
    name: "백승호",
    teamName: "Birmingham City",
    teamLogo: `${CDN}/teams/2.png`,
    league: "Championship",
    leagueLogo: `${CDN}/leagues/40.png`,
    tier: 2,
  },
  {
    id: 237050,  // ✅ 확인됨
    name: "엄지성",
    teamName: "Swansea City",
    teamLogo: `${CDN}/teams/94.png`,
    league: "Championship",
    leagueLogo: `${CDN}/leagues/40.png`,
    tier: 2,
  },
  {
    id: 423708,  // ✅ 확인됨 (Portsmouth 임대 중)
    name: "양민혁",
    teamName: "Portsmouth",
    teamLogo: `${CDN}/teams/743.png`,
    league: "Championship",
    leagueLogo: `${CDN}/leagues/40.png`,
    tier: 2,
  },

  // ── 🇩🇪 2. Bundesliga 임대 ─────────────────────────────────────
  {
    id: 356237,  // ✅ 확인됨 (Brentford 소속 → Kaiserslautern 임대)
    name: "김지수",
    teamName: "Kaiserslautern",
    teamLogo: `${CDN}/teams/176.png`,
    league: "2. Bundesliga",
    leagueLogo: `${CDN}/leagues/79.png`,
    tier: 2,
  },

  // ── 🇧🇪 벨기에 Pro League ──────────────────────────────────────
  {
    id: 26519,   // ✅ 확인됨 (Mainz 소속 → Gent 임대)
    name: "홍현석",
    teamName: "KAA Gent",
    teamLogo: `${CDN}/teams/717.png`,
    league: "Belgian Pro League",
    leagueLogo: `${CDN}/leagues/144.png`,
    tier: 2,
  },

  // ── 🏴󠁧󠁢󠁥󠁮󠁧󠁿 손흥민 (MLS — 사이트 차별화 포인트) ─────────────────
  {
    id: 186,
    name: "손흥민",
    teamName: "LAFC",
    teamLogo: `${CDN}/teams/1611.png`,
    league: "MLS",
    leagueLogo: `${CDN}/leagues/253.png`,
    tier: 2,
  },
]
