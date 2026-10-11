"use client"

import { useEffect, useRef, useState } from "react"

// 쿠팡 파트너스 다이나믹 배너 (2026-10-11, "GoalLine" 배너 · 고객 관심 기반 추천 · 캐러셀).
// 쿠팡이 준 iframe 태그 방식 그대로 쓴다 — referrerpolicy="unsafe-url"이 있어야 어느 페이지에서 왔는지가 쿠팡에 전달된다.
// 배너 id·트래킹 코드는 페이지에 공개되는 값이라 비밀이 아님. 바꾸려면 Vercel 환경변수로 덮어쓰기 가능.
// 공정위 추천·보증 심사지침에 따라 대가성 문구를 배너 바로 아래에 항상 함께 표시한다 (지우지 말 것).

const BANNER_ID = process.env.NEXT_PUBLIC_COUPANG_BANNER_ID || "1038002"
const TRACKING_CODE = process.env.NEXT_PUBLIC_COUPANG_TRACKING_CODE || "AF7872435"
const HEIGHT = 140

export default function CoupangBanner({ className = "" }: { className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  // 화면 폭에 맞춰 배너 폭을 정한다 (모바일에서 680px 고정이면 잘림)
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => setWidth(Math.min(1200, Math.floor(el.clientWidth)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const src =
    width > 0
      ? `https://ads-partners.coupang.com/widgets.html?id=${encodeURIComponent(BANNER_ID)}&template=carousel&trackingCode=${encodeURIComponent(TRACKING_CODE)}&subId=&width=${width}&height=${HEIGHT}&tsource=`
      : null

  return (
    <aside className={className} aria-label="쿠팡 추천 상품">
      <div ref={boxRef} className="w-full" style={{ minHeight: HEIGHT }}>
        {src && (
          <iframe
            key={width}
            title="쿠팡 추천 상품"
            src={src}
            width={width}
            height={HEIGHT}
            frameBorder={0}
            scrolling="no"
            referrerPolicy="unsafe-url"
            loading="lazy"
            className="block mx-auto border-0"
          />
        )}
      </div>
      <p className="mt-1.5 text-xs leading-snug text-floodlight/40">
        이 콘텐츠는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </p>
    </aside>
  )
}
