// 카카오 애드핏 광고 단위를 렌더링하는 컴포넌트.
//
// 카카오 애드핏 스크립트(ba.min.js)는 <ins class="kakao_ad_area"> 안에
// data-ad-unit으로 지정한 광고를 자동으로 채워 넣는 방식이라, React가
// 이 태그의 내부를 직접 관리하면 안 된다(스크립트가 채운 내용과 React가
// 기대하는 내용이 달라 hydration 경고가 날 수 있음). suppressHydrationWarning으로
// 이 요소 하나만 React의 hydration 비교 대상에서 제외한다.
//
// 스크립트 자체(ba.min.js)는 이 컴포넌트가 아니라 app/layout.tsx에서
// 페이지당 한 번만 로드한다 — 광고 자리를 여러 개 추가해도 스크립트가
// 중복 로드되지 않게 하기 위함.
//
// (2026-09-21) 부모(layout.tsx)가 넘겨준 className의 고정 높이(h-16/h-20,
// 64~80px)가 실제 광고 높이(728x90 기준 90px)보다 작아서, overflow-x-auto만
// 지정하고 overflow-y를 안 정하면 브라우저가 overflow-y를 자동으로 'auto'로
// 승격시켜 불필요한 세로 스크롤바가 생기는 문제가 있었다. min-height를 실제
// 광고 높이로 강제(고정 height보다 min-height가 항상 우선 적용됨)하고
// overflow-y를 명시적으로 숨겨서 해결한다.
export default function KakaoAdBanner({
  adUnit,
  width,
  height,
  className = "",
}: {
  adUnit: string
  width: number
  height: number
  className?: string
}) {
  return (
    <div
      className={`flex justify-center overflow-x-auto overflow-y-hidden ${className}`}
      style={{ minHeight: `${height}px` }}
    >
      <ins
        className="kakao_ad_area"
        style={{ display: "none" }}
        data-ad-unit={adUnit}
        data-ad-width={String(width)}
        data-ad-height={String(height)}
        suppressHydrationWarning
      />
    </div>
  )
}
