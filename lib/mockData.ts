// API 호출 한도를 아끼기 위한 가짜(목업) 데이터.
// .env.local에 USE_MOCK_DATA=true 를 넣으면 실제 API 대신 이 데이터를 사용합니다.

export const MOCK_FIXTURES = [
    {
      fixture: {
        id: 1000001,
        date: new Date().toISOString(),
        status: { long: "Match Finished", short: "FT", elapsed: null },
      },
      teams: {
        home: { name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
        away: { name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" },
      },
      goals: { home: 2, away: 1 },
      league: { id: 39, name: "Premier League", country: "England", logo: "https://media.api-sports.io/football/leagues/39.png" },
    },
    {
      fixture: {
        id: 1000002,
        date: new Date().toISOString(),
        status: { long: "Second Half", short: "2H", elapsed: 67 },
      },
      teams: {
        home: { name: "Real Madrid", logo: "https://media.api-sports.io/football/teams/541.png" },
        away: { name: "Barcelona", logo: "https://media.api-sports.io/football/teams/529.png" },
      },
      goals: { home: 1, away: 1 },
      league: { id: 140, name: "La Liga", country: "Spain", logo: "https://media.api-sports.io/football/leagues/140.png" },
    },
    {
      fixture: {
        id: 1000003,
        date: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        status: { long: "Not Started", short: "NS", elapsed: null },
      },
      teams: {
        home: { name: "Bayern Munich", logo: "https://media.api-sports.io/football/teams/157.png" },
        away: { name: "Dortmund", logo: "https://media.api-sports.io/football/teams/165.png" },
      },
      goals: { home: null, away: null },
      league: { id: 78, name: "Bundesliga", country: "Germany", logo: "https://media.api-sports.io/football/leagues/78.png" },
    },
    {
      fixture: {
        id: 1000004,
        date: new Date().toISOString(),
        status: { long: "Match Finished", short: "FT", elapsed: null },
      },
      teams: {
        home: { name: "LA Galaxy", logo: "https://media.api-sports.io/football/teams/1608.png" },
        away: { name: "Inter Miami", logo: "https://media.api-sports.io/football/teams/9568.png" },
      },
      goals: { home: 0, away: 3 },
      league: { id: 253, name: "Major League Soccer", country: "USA", logo: "https://media.api-sports.io/football/leagues/253.png" },
    },
    {
      fixture: {
        id: 1000005,
        date: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        status: { long: "Not Started", short: "NS", elapsed: null },
      },
      teams: {
        home: { name: "Ulsan HD", logo: "https://media.api-sports.io/football/teams/2762.png" },
        away: { name: "Jeonbuk Hyundai Motors", logo: "https://media.api-sports.io/football/teams/2758.png" },
      },
      goals: { home: null, away: null },
      league: { id: 292, name: "K League 1", country: "South Korea", logo: "https://media.api-sports.io/football/leagues/292.png" },
    },
  ]
  
  export const MOCK_STANDINGS = {
    league: {
      id: 39,
      name: "Premier League",
      country: "England",
      logo: "https://media.api-sports.io/football/leagues/39.png",
      season: 2026,
      standings: [
        [
          {
            rank: 1,
            team: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
            points: 20,
            goalsDiff: 15,
            group: "Premier League",
            form: "WWWDW",
            all: { played: 8, win: 6, draw: 2, lose: 0, goals: { for: 22, against: 7 } },
            description: "Champions League",
          },
          {
            rank: 2,
            team: { id: 42, name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" },
            points: 18,
            goalsDiff: 11,
            group: "Premier League",
            form: "WDWWL",
            all: { played: 8, win: 5, draw: 3, lose: 0, goals: { for: 18, against: 7 } },
            description: "Champions League",
          },
          {
            rank: 3,
            team: { id: 40, name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png" },
            points: 16,
            goalsDiff: 8,
            group: "Premier League",
            form: "WLWWD",
            all: { played: 8, win: 5, draw: 1, lose: 2, goals: { for: 16, against: 8 } },
            description: "Champions League",
          },
        ],
      ],
    },
  }
  
  // 경기 상세 페이지용 목업 데이터 (여러 엔드포인트를 하나로 묶어둠)
  export const MOCK_MATCH_DETAIL = {
    fixture: [
      {
        fixture: {
          id: 1000001,
          date: new Date().toISOString(),
          status: { long: "Match Finished", short: "FT" },
          venue: { name: "Etihad Stadium", city: "Manchester" },
          referee: "Michael Oliver",
        },
        teams: {
          home: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png", winner: true },
          away: { id: 42, name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png", winner: false },
        },
        goals: { home: 2, away: 1 },
        league: { id: 39, name: "Premier League", country: "England", logo: "https://media.api-sports.io/football/leagues/39.png", round: "Regular Season - 1" },
      },
    ],
    statistics: [
      {
        team: { name: "Manchester City" },
        statistics: [
          { type: "Shots on Goal", value: 7 },
          { type: "Total Shots", value: 15 },
          { type: "Ball Possession", value: "58%" },
          { type: "Corner Kicks", value: 6 },
          { type: "Fouls", value: 9 },
        ],
      },
      {
        team: { name: "Arsenal" },
        statistics: [
          { type: "Shots on Goal", value: 4 },
          { type: "Total Shots", value: 10 },
          { type: "Ball Possession", value: "42%" },
          { type: "Corner Kicks", value: 3 },
          { type: "Fouls", value: 11 },
        ],
      },
    ],
    events: [
      {
        time: { elapsed: 23, extra: null },
        team: { name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
        player: { name: "E. Haaland" },
        assist: { name: "K. De Bruyne" },
        type: "Goal",
        detail: "Normal Goal",
      },
      {
        time: { elapsed: 41, extra: null },
        team: { name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" },
        player: { name: "B. Saka" },
        assist: { name: null },
        type: "Goal",
        detail: "Normal Goal",
      },
      {
        time: { elapsed: 68, extra: null },
        team: { name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
        player: { name: "P. Foden" },
        assist: { name: "J. Grealish" },
        type: "Goal",
        detail: "Normal Goal",
      },
      {
        time: { elapsed: 75, extra: null },
        team: { name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
        player: { name: "K. De Bruyne" },
        assist: { name: "P. Foden" },
        type: "subst",
        detail: "Substitution",
      },
    ],
    players: [
      {
        team: { name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
        players: [
          {
            player: { name: "E. Haaland", photo: "https://media.api-sports.io/football/players/1100.png" },
            statistics: [{ games: { rating: "8.7", position: "F" }, goals: { total: 1, assists: 0 } }],
          },
          {
            player: { name: "K. De Bruyne", photo: "https://media.api-sports.io/football/players/627.png" },
            statistics: [{ games: { rating: "8.4", position: "M" }, goals: { total: 0, assists: 2 } }],
          },
        ],
      },
      {
        team: { name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" },
        players: [
          {
            player: { name: "B. Saka", photo: "https://media.api-sports.io/football/players/19460.png" },
            statistics: [{ games: { rating: "7.2", position: "M" }, goals: { total: 1, assists: 0 } }],
          },
        ],
      },
    ],
    lineups: [
      {
        team: { name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
        formation: "4-3-3",
        startXI: [
          { player: { id: 1, name: "Ederson", number: 31, pos: "G", grid: "1:1" } },
          { player: { id: 2, name: "Walker", number: 2, pos: "D", grid: "2:4" } },
          { player: { id: 3, name: "Dias", number: 3, pos: "D", grid: "2:3" } },
          { player: { id: 4, name: "Stones", number: 5, pos: "D", grid: "2:2" } },
          { player: { id: 5, name: "Ake", number: 6, pos: "D", grid: "2:1" } },
          { player: { id: 6, name: "Rodri", number: 16, pos: "M", grid: "3:2" } },
          { player: { id: 7, name: "De Bruyne", number: 17, pos: "M", grid: "3:3" } },
          { player: { id: 8, name: "Silva", number: 20, pos: "M", grid: "3:1" } },
          { player: { id: 9, name: "Grealish", number: 10, pos: "F", grid: "4:1" } },
          { player: { id: 10, name: "Haaland", number: 9, pos: "F", grid: "4:2" } },
          { player: { id: 11, name: "Foden", number: 47, pos: "F", grid: "4:3" } },
        ],
        coach: { name: "Pep Guardiola" },
      },
      {
        team: { name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" },
        formation: "4-3-3",
        startXI: [
          { player: { id: 12, name: "Raya", number: 1, pos: "G", grid: "1:1" } },
          { player: { id: 13, name: "White", number: 4, pos: "D", grid: "2:4" } },
          { player: { id: 14, name: "Saliba", number: 2, pos: "D", grid: "2:3" } },
          { player: { id: 15, name: "Gabriel", number: 6, pos: "D", grid: "2:2" } },
          { player: { id: 16, name: "Zinchenko", number: 35, pos: "D", grid: "2:1" } },
          { player: { id: 17, name: "Rice", number: 41, pos: "M", grid: "3:2" } },
          { player: { id: 18, name: "Odegaard", number: 8, pos: "M", grid: "3:3" } },
          { player: { id: 19, name: "Havertz", number: 29, pos: "M", grid: "3:1" } },
          { player: { id: 20, name: "Martinelli", number: 11, pos: "F", grid: "4:1" } },
          { player: { id: 21, name: "Jesus", number: 9, pos: "F", grid: "4:2" } },
          { player: { id: 22, name: "Saka", number: 7, pos: "F", grid: "4:3" } },
        ],
        coach: { name: "Mikel Arteta" },
      },
    ],
    headtohead: [
      {
        fixture: { id: 900001, date: "2025-11-10T15:00:00+00:00" },
        teams: { home: { name: "Arsenal", winner: false }, away: { name: "Manchester City", winner: true } },
        goals: { home: 0, away: 1 },
      },
      {
        fixture: { id: 900002, date: "2025-04-05T15:00:00+00:00" },
        teams: { home: { name: "Manchester City", winner: null }, away: { name: "Arsenal", winner: null } },
        goals: { home: 1, away: 1 },
      },
    ],
    predictions: [
      {
        predictions: {
          winner: { name: "Manchester City", comment: "Manchester City가 최근 5경기 중 4승으로 강세" },
          percent: { home: "58%", draw: "24%", away: "18%" },
        },
      },
    ],
  }

  // 리그 전체 일정(라운드별)용 목업 데이터
export const MOCK_SEASON_FIXTURES = [
  {
    fixture: { id: 2000001, date: new Date(Date.now() - 7 * 86400000).toISOString(), status: { long: "Match Finished", short: "FT" } },
    league: { round: "Regular Season - 7" },
    teams: {
      home: { name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
      away: { name: "Chelsea", logo: "https://media.api-sports.io/football/teams/49.png" },
    },
    goals: { home: 3, away: 1 },
  },
  {
    fixture: { id: 2000002, date: new Date(Date.now() - 7 * 86400000).toISOString(), status: { long: "Match Finished", short: "FT" } },
    league: { round: "Regular Season - 7" },
    teams: {
      home: { name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" },
      away: { name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png" },
    },
    goals: { home: 1, away: 1 },
  },
  {
    fixture: { id: 2000003, date: new Date().toISOString(), status: { long: "Match Finished", short: "FT" } },
    league: { round: "Regular Season - 8" },
    teams: {
      home: { name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
      away: { name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" },
    },
    goals: { home: 2, away: 1 },
  },
  {
    fixture: { id: 2000004, date: new Date().toISOString(), status: { long: "Match Finished", short: "FT" } },
    league: { round: "Regular Season - 8" },
    teams: {
      home: { name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png" },
      away: { name: "Chelsea", logo: "https://media.api-sports.io/football/teams/49.png" },
    },
    goals: { home: 2, away: 2 },
  },
  {
    fixture: { id: 2000005, date: new Date(Date.now() + 7 * 86400000).toISOString(), status: { long: "Not Started", short: "NS" } },
    league: { round: "Regular Season - 9" },
    teams: {
      home: { name: "Chelsea", logo: "https://media.api-sports.io/football/teams/49.png" },
      away: { name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" },
    },
    goals: { home: null, away: null },
  },
  {
    fixture: { id: 2000006, date: new Date(Date.now() + 7 * 86400000).toISOString(), status: { long: "Not Started", short: "NS" } },
    league: { round: "Regular Season - 9" },
    teams: {
      home: { name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png" },
      away: { name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
    },
    goals: { home: null, away: null },
  },
]


// 팀 개별 페이지용 목업 데이터
export const MOCK_TEAM_INFO = {
  team: {
    id: 50,
    name: "Manchester City",
    country: "England",
    founded: 1880,
    logo: "https://media.api-sports.io/football/teams/50.png",
  },
  venue: {
    name: "Etihad Stadium",
    city: "Manchester",
    capacity: 55097,
  },
}

export const MOCK_TEAM_SQUAD = [
  {
    player: { id: 1, name: "Ederson", age: 31, photo: "https://media.api-sports.io/football/players/1041.png" },
    position: "Goalkeeper",
  },
  {
    player: { id: 2, name: "Stefan Ortega", age: 32, photo: "https://media.api-sports.io/football/players/1042.png" },
    position: "Goalkeeper",
  },
  {
    player: { id: 3, name: "Ruben Dias", age: 28, photo: "https://media.api-sports.io/football/players/1044.png" },
    position: "Defender",
  },
  {
    player: { id: 4, name: "Kyle Walker", age: 35, photo: "https://media.api-sports.io/football/players/1045.png" },
    position: "Defender",
  },
  {
    player: { id: 5, name: "John Stones", age: 31, photo: "https://media.api-sports.io/football/players/1046.png" },
    position: "Defender",
  },
  {
    player: { id: 6, name: "Rodri", age: 29, photo: "https://media.api-sports.io/football/players/627.png" },
    position: "Midfielder",
  },
  {
    player: { id: 7, name: "Kevin De Bruyne", age: 34, photo: "https://media.api-sports.io/football/players/627.png" },
    position: "Midfielder",
  },
  {
    player: { id: 8, name: "Bernardo Silva", age: 31, photo: "https://media.api-sports.io/football/players/1048.png" },
    position: "Midfielder",
  },
  {
    player: { id: 9, name: "Erling Haaland", age: 25, photo: "https://media.api-sports.io/football/players/1100.png" },
    position: "Attacker",
  },
  {
    player: { id: 10, name: "Phil Foden", age: 26, photo: "https://media.api-sports.io/football/players/1050.png" },
    position: "Attacker",
  },
  {
    player: { id: 11, name: "Jack Grealish", age: 30, photo: "https://media.api-sports.io/football/players/1051.png" },
    position: "Attacker",
  },
]

export const MOCK_TEAM_FIXTURES = [
  {
    fixture: { id: 2000001, date: new Date(Date.now() - 7 * 86400000).toISOString(), status: { long: "Match Finished", short: "FT" } },
    teams: {
      home: { name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
      away: { name: "Chelsea", logo: "https://media.api-sports.io/football/teams/49.png" },
    },
    goals: { home: 3, away: 1 },
  },
  {
    fixture: { id: 2000003, date: new Date().toISOString(), status: { long: "Match Finished", short: "FT" } },
    teams: {
      home: { name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
      away: { name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" },
    },
    goals: { home: 2, away: 1 },
  },
  {
    fixture: { id: 2000006, date: new Date(Date.now() + 7 * 86400000).toISOString(), status: { long: "Not Started", short: "NS" } },
    teams: {
      home: { name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png" },
      away: { name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
    },
    goals: { home: null, away: null },
  },
]

// 선수 개인 통계 페이지용 목업 데이터
export const MOCK_PLAYER = {
  player: {
    id: 1100,
    name: "Erling Haaland",
    firstname: "Erling",
    lastname: "Haaland",
    age: 25,
    birth: { date: "2000-07-21", country: "Norway" },
    nationality: "Norway",
    height: "195 cm",
    weight: "88 kg",
    photo: "https://media.api-sports.io/football/players/1100.png",
  },
  statistics: [
    {
      team: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
      league: { id: 39, name: "Premier League", logo: "https://media.api-sports.io/football/leagues/39.png", country: "England" },
      games: { appearences: 8, lineups: 8, minutes: 690, position: "Attacker", rating: "8.1", captain: false },
      substitutes: { in: 0, out: 2, bench: 0 },
      goals: { total: 11, assists: 3, conceded: 0, saves: null },
      shots: { total: 32, on: 19 },
      passes: { total: 120, key: 8, accuracy: 78 },
      tackles: { total: 6, blocks: 1, interceptions: 2 },
      duels: { total: 60, won: 34 },
      dribbles: { attempts: 14, success: 9, past: null },
      fouls: { drawn: 12, committed: 5 },
      cards: { yellow: 1, yellowred: 0, red: 0 },
      penalty: { won: 1, committed: null, scored: 1, missed: 0, saved: null },
    },
  ],
}

// 선수 이적 이력 목업
export const MOCK_PLAYER_TRANSFERS = [
  {
    player: { id: 1100, name: "Erling Haaland" },
    update: "2022-07-01",
    transfers: [
      {
        date: "2022-07-01",
        type: "€60M",
        teams: {
          in: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
          out: { id: 165, name: "Borussia Dortmund", logo: "https://media.api-sports.io/football/teams/165.png" },
        },
      },
    ],
  },
]

// 선수 최근 경기 목업 (팀 최근 경기 + 이 선수의 개인 기록을 합쳐놓은 형태)
export const MOCK_PLAYER_RECENT_MATCHES = [
  {
    fixture: { id: 1570334, date: new Date().toISOString() },
    teams: {
      home: { name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
      away: { name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" },
    },
    goals: { home: 2, away: 1 },
    stat: {
      games: { minutes: 90, rating: "8.1" },
      goals: { total: 1, assists: 0 },
      cards: { yellow: 0, red: 0 },
    },
  },
]

// 검색 결과용 목업 데이터
export const MOCK_SEARCH_RESULTS = {
  teams: [
    { team: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png", country: "England" } },
    { team: { id: 42, name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png", country: "England" } },
  ],
  players: [
    { player: { id: 1100, name: "Erling Haaland", photo: "https://media.api-sports.io/football/players/1100.png", nationality: "Norway" } },
  ],
  leagues: [
    { league: { id: 39, name: "Premier League", logo: "https://media.api-sports.io/football/leagues/39.png", country: "England" } },
  ],
}

// 이적 정보 목업 데이터 (팀별 이적 기록 형태 — API-Football 실제 구조와 동일하게 맞춤)
export const MOCK_TRANSFERS = [
  {
    player: { id: 2001, name: "Julian Alvarez", photo: "https://media.api-sports.io/football/players/2001.png" },
    update: "2026-08-15",
    transfers: [
      {
        date: "2026-08-10",
        type: "€75M",
        teams: {
          in: { id: 541, name: "Real Madrid", logo: "https://media.api-sports.io/football/teams/541.png" },
          out: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
        },
      },
    ],
  },
  {
    player: { id: 2002, name: "Kobbie Mainoo", photo: "https://media.api-sports.io/football/players/2002.png" },
    update: "2026-08-13",
    transfers: [
      {
        date: "2026-08-08",
        type: "Loan",
        teams: {
          in: { id: 165, name: "Borussia Dortmund", logo: "https://media.api-sports.io/football/teams/165.png" },
          out: { id: 42, name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" },
        },
      },
    ],
  },
  {
    player: { id: 2003, name: "Marcus Rashford", photo: "https://media.api-sports.io/football/players/2003.png" },
    update: "2026-08-05",
    transfers: [
      {
        date: "2026-08-01",
        type: "Free",
        teams: {
          in: { id: 157, name: "Bayern Munich", logo: "https://media.api-sports.io/football/teams/157.png" },
          out: { id: 529, name: "Barcelona", logo: "https://media.api-sports.io/football/teams/529.png" },
        },
      },
    ],
  },
]

// 한국인 해외파 선수 목업 데이터 (사이트 차별화 포인트).
// 실제 배포 시엔 KOREAN_PLAYERS_ABROAD의 선수 ID를 API-Football의 정확한 ID로 검증해서 넣어야 함
export const MOCK_KOREAN_ABROAD = [
  {
    player: { id: 3001, name: "손흥민", firstname: "Heung-min", lastname: "Son", photo: "https://media.api-sports.io/football/players/186.png" },
    statistics: [
      {
        team: { name: "Tottenham", logo: "https://media.api-sports.io/football/teams/47.png" },
        league: { name: "Premier League" },
        games: { appearences: 7, rating: "7.4" },
        goals: { total: 4, assists: 2 },
      },
    ],
  },
  {
    player: { id: 3002, name: "김민재", firstname: "Min-jae", lastname: "Kim", photo: "https://media.api-sports.io/football/players/19107.png" },
    statistics: [
      {
        team: { name: "Bayern Munich", logo: "https://media.api-sports.io/football/teams/157.png" },
        league: { name: "Bundesliga" },
        games: { appearences: 8, rating: "7.1" },
        goals: { total: 1, assists: 0 },
      },
    ],
  },
  {
    player: { id: 3003, name: "이강인", firstname: "Kang-in", lastname: "Lee", photo: "https://media.api-sports.io/football/players/18894.png" },
    statistics: [
      {
        team: { name: "Paris Saint Germain", logo: "https://media.api-sports.io/football/teams/85.png" },
        league: { name: "Ligue 1" },
        games: { appearences: 6, rating: "7.6" },
        goals: { total: 2, assists: 4 },
      },
    ],
  },
  {
    player: { id: 3004, name: "황희찬", firstname: "Hee-chan", lastname: "Hwang", photo: "https://media.api-sports.io/football/players/19187.png" },
    statistics: [
      {
        team: { name: "Wolverhampton", logo: "https://media.api-sports.io/football/teams/39.png" },
        league: { name: "Premier League" },
        games: { appearences: 8, rating: "6.9" },
        goals: { total: 3, assists: 1 },
      },
    ],
  },
]

// 득점 순위(Top Scorers) 목업 데이터
export const MOCK_TOP_SCORERS = [
  {
    player: { id: 1100, name: "Erling Haaland", photo: "https://media.api-sports.io/football/players/1100.png" },
    statistics: [
      {
        team: { name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
        goals: { total: 11, assists: 3 },
        games: { appearences: 8 },
      },
    ],
  },
  {
    player: { id: 306, name: "B. Saka", photo: "https://media.api-sports.io/football/players/19460.png" },
    statistics: [
      {
        team: { name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" },
        goals: { total: 8, assists: 5 },
        games: { appearences: 8 },
      },
    ],
  },
  {
    player: { id: 627, name: "K. De Bruyne", photo: "https://media.api-sports.io/football/players/627.png" },
    statistics: [
      {
        team: { name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
        goals: { total: 6, assists: 7 },
        games: { appearences: 7 },
      },
    ],
  },
]


// 부상자/결장 명단 목업 데이터
export const MOCK_INJURIES = [
  {
    player: { id: 9999, name: "T. Injured Player", photo: "https://media.api-sports.io/football/players/9999.png" },
    team: { name: "Manchester City" },
    fixture: { date: "2026-08-15" },
    type: "Injury",
    reason: "Hamstring",
  },
]

// 감독 정보 목업 데이터
export const MOCK_COACH = {
  id: 1,
  name: "Pep Guardiola",
  firstname: "Pep",
  lastname: "Guardiola",
  age: 55,
  nationality: "Spain",
  photo: "https://media.api-sports.io/football/coachs/1.png",
  career: [
    { team: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" }, start: "2016-07-01", end: null },
  ],
}

// 트로피(우승 이력) 목업 데이터
export const MOCK_TROPHIES = [
  { league: "Premier League", country: "England", season: "2023/2024", place: "Winner" },
  { league: "Premier League", country: "England", season: "2022/2023", place: "Winner" },
  { league: "UEFA Champions League", country: "World", season: "2022/2023", place: "Winner" },
  { league: "FA Cup", country: "England", season: "2022/2023", place: "2nd Place" },
]



// 축구 뉴스 목업 데이터
export const MOCK_NEWS = [
  {
    title: "손흥민, LAFC 데뷔 후 첫 멀티골 기록",
    link: "https://example.com/news/1",
    image_url: "https://placehold.co/400x240/14301f/f5b942?text=Football+News",
    pubDate: "2026-08-18 10:00:00",
    source_name: "예시 스포츠",
    description: "LAFC로 이적한 손흥민이 데뷔 이후 처음으로 한 경기 2골을 기록하며 팀 승리를 이끌었다.",
  },
  {
    title: "프리미어리그 개막, 우승 후보는?",
    link: "https://example.com/news/2",
    image_url: "https://placehold.co/400x240/14301f/f5b942?text=Football+News",
    pubDate: "2026-08-17 08:30:00",
    source_name: "예시 스포츠",
    description: "2026-27시즌 프리미어리그가 개막을 앞두고 있는 가운데, 전문가들의 우승 후보 전망이 엇갈리고 있다.",
  },
]

// 경기 상세 페이지 "팀 기록"(최근 5경기) 목업 데이터 — 실제로는 팀 id로 요청하지만
// 목업 모드에서는 어떤 팀이 요청해도 동일한 샘플을 돌려줌
export const MOCK_TEAM_RECENT_FIXTURES = [
  {
    fixture: { id: 900001, date: "2026-08-10T19:00:00+00:00", status: { short: "FT" } },
    teams: {
      home: { id: 49, name: "Marseille", logo: "https://media.api-sports.io/football/teams/49.png" },
      away: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
    },
    goals: { home: 1, away: 2 },
    league: { name: "Champions League", logo: "https://media.api-sports.io/football/leagues/2.png" },
  },
  {
    fixture: { id: 900002, date: "2026-08-12T19:00:00+00:00", status: { short: "FT" } },
    teams: {
      home: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
      away: { id: 42, name: "Arsenal", logo: "https://media.api-sports.io/football/teams/42.png" },
    },
    goals: { home: 3, away: 1 },
    league: { name: "Premier League", logo: "https://media.api-sports.io/football/leagues/39.png" },
  },
  {
    fixture: { id: 900003, date: "2026-08-14T19:00:00+00:00", status: { short: "FT" } },
    teams: {
      home: { id: 33, name: "Manchester United", logo: "https://media.api-sports.io/football/teams/33.png" },
      away: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
    },
    goals: { home: 2, away: 1 },
    league: { name: "Premier League", logo: "https://media.api-sports.io/football/leagues/39.png" },
  },
  {
    fixture: { id: 900004, date: "2026-08-16T19:00:00+00:00", status: { short: "FT" } },
    teams: {
      home: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
      away: { id: 48, name: "Getafe", logo: "https://media.api-sports.io/football/teams/48.png" },
    },
    goals: { home: 4, away: 1 },
    league: { name: "Premier League", logo: "https://media.api-sports.io/football/leagues/39.png" },
  },
  {
    fixture: { id: 900005, date: "2026-08-18T19:00:00+00:00", status: { short: "FT" } },
    teams: {
      home: { id: 533, name: "Villarreal", logo: "https://media.api-sports.io/football/teams/533.png" },
      away: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
    },
    goals: { home: 5, away: 1 },
    league: { name: "Premier League", logo: "https://media.api-sports.io/football/leagues/39.png" },
  },
]

// 경기 상세 페이지 "다음 경기" 목업 데이터
export const MOCK_NEXT_FIXTURE = [
  {
    fixture: { id: 900010, date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), status: { short: "NS" } },
    teams: {
      home: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png" },
      away: { id: 533, name: "Villarreal", logo: "https://media.api-sports.io/football/teams/533.png" },
    },
    goals: { home: null, away: null },
    league: { name: "Premier League", logo: "https://media.api-sports.io/football/leagues/39.png" },
  },
]


// 팀 이적 기록 목업 데이터 (/transfers?team= 응답 구조)
export const MOCK_TEAM_TRANSFERS = [
  {
    player: { id: 5001, name: "Cristian Romero" },
    update: "2026-08-15",
    transfers: [
      {
        date: "2026-08-15",
        type: "€ 40M",
        teams: {
          in: { id: 530, name: "Atletico Madrid", logo: "https://media.api-sports.io/football/teams/530.png" },
          out: { id: 47, name: "Tottenham", logo: "https://media.api-sports.io/football/teams/47.png" },
        },
      },
    ],
  },
  {
    player: { id: 5002, name: "Nahuel Molina" },
    update: "2026-08-12",
    transfers: [
      {
        date: "2026-08-12",
        type: "€ 18M",
        teams: {
          in: { id: 497, name: "Roma", logo: "https://media.api-sports.io/football/teams/497.png" },
          out: { id: 530, name: "Atletico Madrid", logo: "https://media.api-sports.io/football/teams/530.png" },
        },
      },
    ],
  },
]

// 팀이 속한 리그 정보 목업 (/leagues?team=&current=true)
export const MOCK_TEAM_LEAGUE = { league: { id: 39, name: "Premier League", season: 2026 } }


// 팀 페이지 "플레이어 통계" 탭 목업 데이터
export const MOCK_TEAM_PLAYER_STATS = [
  {
    player: { id: 1338192, name: "Pablo Barrios", photo: "https://media.api-sports.io/football/players/1338192.png" },
    statistics: [
      { games: { appearences: 1, minutes: 90, rating: "6.80" }, goals: { total: 0, assists: 0 } },
    ],
  },
  {
    player: { id: 727897, name: "Dávid Hancko", photo: "https://media.api-sports.io/football/players/727897.png" },
    statistics: [
      { games: { appearences: 1, minutes: 90, rating: "8.66" }, goals: { total: 0, assists: 1 } },
    ],
  },
  {
    player: { id: 927, name: "Kang-In Lee", photo: "https://media.api-sports.io/football/players/927.png" },
    statistics: [
      { games: { appearences: 1, minutes: 33, rating: "7.87" }, goals: { total: 1, assists: 0 } },
    ],
  },
  {
    player: { id: 942372, name: "Álex Baena", photo: "https://media.api-sports.io/football/players/942372.png" },
    statistics: [
      { games: { appearences: 1, minutes: 33, rating: "7.50" }, goals: { total: 1, assists: 0 } },
    ],
  },
  {
    player: { id: 690516, name: "Ademola Lookman", photo: "https://media.api-sports.io/football/players/690516.png" },
    statistics: [
      { games: { appearences: 1, minutes: 90, rating: "6.80" }, goals: { total: 0, assists: 0 } },
    ],
  },
]
