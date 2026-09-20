"use client"

import Image from "next/image"
import { useState } from "react"

// Generic team/league crest renderer backed by next/image (fill pattern).
// Wrap size via className (e.g. "w-5 h-5 shrink-0") exactly like a plain <img> would.
//
// (2026-09-21) 프리미어리그 엠블럼(짙은 보라색 사자 머리)은 이 사이트의 어두운
// 배경(다크 테마) 위에서 거의 안 보인다. 예전엔 이 로고를 쓰는 페이지마다 각각
// className에 "brightness-0 invert"를 수동으로 붙였는데(경기 상세 페이지, 해외파
// 페이지 등), 이 로고가 새로 쓰이는 곳마다 매번 빠뜨리는 문제가 반복됐다
// (선수 상세 페이지 헤더에서도 재발). src URL 자체로 프리미어리그 로고인지
// 판별해서, 이 컴포넌트 안에서 한 번만 처리하면 어디서 쓰든 항상 적용된다.
const PREMIER_LEAGUE_LOGO_PATTERNS = ["/leagues/pl.png", "/leagues/39.png"]

function isPremierLeagueLogo(src: string): boolean {
  return PREMIER_LEAGUE_LOGO_PATTERNS.some((pattern) => src.includes(pattern))
}

export default function Logo({
  src,
  alt = "",
  className,
}: {
  src?: string | null
  alt?: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null

  const needsWhiteFilter = isPremierLeagueLogo(src)

  return (
    <span
      className={`${className} relative inline-block${needsWhiteFilter ? " brightness-0 invert" : ""}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="48px"
        className="object-contain"
        // API 서버가 일시적으로 로고를 못 줄 때 깨진 아이콘 대신 그냥 안 보이게 처리
        onError={() => setFailed(true)}
      />
    </span>
  )
}
