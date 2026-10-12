// 자동 칼럼 초안 종류 — 클라이언트 컴포넌트에서도 쓰므로 서버 전용 import를 두지 않는다
export const OPINION_PLACEHOLDER = "(여기에 직접 한두 줄 의견을 써주세요)"

// 초안 종류별 slug 표식 — 중복 생성 방지, 관리자 화면 분류에 쓴다
export const DRAFT_KINDS = {
  weekly: { mark: "weekly-korean-abroad", label: "주간 해외파 정리" },
  weekend: { mark: "weekend-korean-schedule", label: "주말 해외파 일정" },
  report: { mark: "match-report", label: "경기 직후 리포트" },
  kleague: { mark: "kleague-round", label: "K리그 라운드 정리" },
  club: { mark: "club-match", label: "유럽 빅클럽 경기 리포트" },
} as const
export type DraftKind = keyof typeof DRAFT_KINDS

export function draftKindOf(slug: string): DraftKind | null {
  for (const [k, v] of Object.entries(DRAFT_KINDS)) if (slug.includes(v.mark)) return k as DraftKind
  return null
}
