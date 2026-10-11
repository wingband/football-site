// 게시판 분류 (2026-10-11). 게시글은 board_posts.category에 key로 저장된다.
// 순서가 곧 탭 순서. 새 게시판은 여기에 한 줄만 추가하면 목록 탭/글쓰기/검증에 모두 반영된다.
export const BOARD_CATEGORIES = [
  { key: "free", label: "자유", title: "자유게시판", desc: "축구 얘기, 아무 얘기나 편하게 남겨주세요" },
  { key: "epl", label: "PL", title: "PL 게시판", desc: "프리미어리그 경기·이적·순위 이야기" },
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

// 예전에 있던 분류로 쓴 글도 목록에서는 이름이 나오게 한다 (새 글은 위 4개만 선택 가능)
const LEGACY_LABELS: Record<string, string> = {
  abroad: "해외파", laliga: "라리가", bundesliga: "분데스리가", seriea: "세리에A", ligue1: "리그1", ucl: "챔스",
}

export function boardCategoryLabel(key: string) {
  return boardCategory(key)?.label ?? LEGACY_LABELS[key] ?? key
}
