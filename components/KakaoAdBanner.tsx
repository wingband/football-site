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
    <div className={`flex justify-center overflow-x-auto ${className}`}>
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
