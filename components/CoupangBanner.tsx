// 쿠팡 파트너스 다이나믹 배너 (2026-10-11).
// 쿠팡 배너 스크립트(g.js)는 document.write로 그려서 React 페이지에 바로 넣으면 깨진다 →
// 작은 iframe(srcDoc) 안에서 실행한다.
// Vercel 환경변수 NEXT_PUBLIC_COUPANG_BANNER_ID / NEXT_PUBLIC_COUPANG_TRACKING_CODE가 없으면 아무것도 안 그린다.
// 공정위 추천·보증 심사지침에 따라 대가성 문구를 배너 바로 아래에 항상 함께 표시한다.

const BANNER_ID = process.env.NEXT_PUBLIC_COUPANG_BANNER_ID
const TRACKING_CODE = process.env.NEXT_PUBLIC_COUPANG_TRACKING_CODE

export default function CoupangBanner({ className = "", height = 140 }: { className?: string; height?: number }) {
  const id = Number(BANNER_ID)
  if (!id || !TRACKING_CODE || !/^AF\d+$/.test(TRACKING_CODE)) return null

  const config = JSON.stringify({ id, template: "carousel", trackingCode: TRACKING_CODE, width: "100%", height: String(height), tsource: "" })
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body><script src="https://ads-partners.coupang.com/g.js"></script><script>new PartnersCoupang.G(${config});</script></body></html>`

  return (
    <aside className={className} aria-label="쿠팡 추천 상품">
      <iframe
        title="쿠팡 추천 상품"
        srcDoc={srcDoc}
        width="100%"
        height={height}
        loading="lazy"
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin"
        className="block w-full border-0"
        style={{ height }}
      />
      <p className="mt-1.5 text-[10px] leading-snug text-floodlight/40">
        이 콘텐츠는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </p>
    </aside>
  )
}
