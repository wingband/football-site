import { ImageResponse } from "next/og"

// 개별 페이지에 자체 opengraph-image가 없는 모든 페이지(홈/matches, 순위표,
// 해외파 트래커 등)에 기본으로 적용되는 사이트 대표 공유 카드.
// (2026-09-21) 네이버 서치어드바이저에서 "Open Graph 제목/설명 없음"으로
// 지적됨 — 카카오톡/네이버/페이스북 등에 링크 공유 시 미리보기 카드가
// 아예 안 뜨고 있었음. 경기 상세 페이지(app/matches/[slug]/opengraph-image.tsx)와
// 동일하게 next/og의 ImageResponse로 동적 생성해, 별도 이미지 파일 업로드 없이
// 코드만으로 처리한다.
export const alt = "GoalLine - 실시간 축구 스코어 · 순위표 · 경기 분석"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const BG = "#0d1f15"
const GOLD = "#f5b942"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: BG,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: GOLD,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          GoalLine
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 34,
            color: "#e8ece8",
            display: "flex",
          }}
        >
          실시간 축구 스코어 · 순위표 · 경기 분석
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 24,
            color: "#9aa89a",
            display: "flex",
          }}
        >
          한국인 해외파 선수 소식도 매일 업데이트
        </div>
      </div>
    ),
    { ...size }
  )
}
