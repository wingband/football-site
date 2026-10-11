import type { Metadata } from "next"

// /stories 목록은 클라이언트 컴포넌트라 메타데이터를 여기서 지정한다 (2026-10-11)
export const metadata: Metadata = {
  title: "경기 리뷰",
  description: "프리미어리그·해외파 경기를 데이터로 정리한 GoalLine 경기 리뷰 모음.",
  alternates: { canonical: "/stories" },
}

export default function StoriesLayout({ children }: { children: React.ReactNode }) {
  return children
}
