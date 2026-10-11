// 게시판 분류 (2026-10-11). 게시글은 board_posts.category에 key로 저장된다.
// 순서가 곧 탭 순서. 새 게시판은 여기에 한 줄만 추가하면 목록 탭/글쓰기/검증에 모두 반영된다.
export const BOARD_CATEGORIES = [
  { key: "free", label: "자유", title: "자유게시판", desc: "축구 얘기, 아무 얘기나 편하게 남겨주세요" },
  { key: "abroad", label: "해외파", title: "해외파 게시판", desc: "손흥민·이강인·김민재 등 한국인 해외파 이야기" },
  { key: "epl", label: "프리미어리그", title: "프리미어리그 게시판", desc: "EPL 경기·이적·순위 이야기" },
  { key: "laliga", label: "라리가", title: "라리가 게시판", desc: "스페인 라리가 이야기" },
  { key: "bundesliga", label: "분데스리가", title: "분데스리가 게시판", desc: "독일 분데스리가 이야기" },
  { key: "seriea", label: "세리에A", title: "세리에A 게시판", desc: "이탈리아 세리에A 이야기" },
  { key: "ligue1", label: "리그1", title: "리그1 게시판", desc: "프랑스 리그1 이야기" },
  { key: "ucl", label: "챔피언스리그", title: "챔피언스리그 게시판", desc: "UEFA 챔피언스리그·유로파 이야기" },
  { key: "kleague", label: "K리그", title: "K리그 게시판", desc: "K리그 경기와 선수 이야기" },
  { key: "national", label: "국가대표", title: "국가대표 게시판", desc: "대한민국 축구 국가대표 이야기" },
] as const

export type BoardCategoryKey = (typeof BOARD_CATEGORIES)[number]["key"]

export function isBoardCategory(key: unknown): key is BoardCategoryKey {
  return typeof key === "string" && BOARD_CATEGORIES.some((c) => c.key === key)
}

export function boardCategory(key: string | null | undefined) {
  return BOARD_CATEGORIES.find((c) => c.key === key) ?? null
}

export function boardCategoryLabel(key: string) {
  return boardCategory(key)?.label ?? key
}
