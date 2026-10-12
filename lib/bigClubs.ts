// 빅클럽 경기 리포트 대상 (2026-10-12). API-Football 팀 ID.
// 클럽을 더하려면 이 목록에 한 줄만 추가하면 된다.
export const BIG_CLUBS: { id: number; ko: string }[] = [
  { id: 33, ko: "맨체스터 유나이티드" },
  { id: 50, ko: "맨체스터 시티" },
  { id: 49, ko: "첼시" },
  { id: 40, ko: "리버풀" },
  { id: 47, ko: "토트넘" },
  { id: 42, ko: "아스날" },
  { id: 541, ko: "레알 마드리드" },
  { id: 530, ko: "아틀레티코 마드리드" },
  { id: 529, ko: "바르셀로나" },
  { id: 157, ko: "바이에른 뮌헨" },
  { id: 165, ko: "도르트문트" },
  { id: 85, ko: "파리 생제르맹" },
  { id: 505, ko: "인테르" },
  { id: 489, ko: "AC 밀란" },
  { id: 496, ko: "유벤투스" },
  { id: 492, ko: "나폴리" },
  { id: 168, ko: "레버쿠젠" },
]
export const BIG_CLUB_IDS = new Set(BIG_CLUBS.map((c) => c.id))
