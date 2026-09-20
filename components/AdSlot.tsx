// 광고가 들어갈 자리를 미리 잡아두는 컴포넌트.
// 지금은 자리만 표시하고, 나중에 애드센스(또는 다른 광고 코드)를 이 안에 넣으면 됩니다.
//
// (2026-09-21) AdSense 심사 신청 전, 점선 테두리 + "광고 영역" placeholder 텍스트를
// 화면에 그대로 노출하지 않도록 수정. 심사관이 사이트를 훑어볼 때 이런 표시가 보이면
// "미완성 사이트"로 비칠 수 있어서다. 레이아웃 자리(className으로 지정된 높이/너비)는
// 그대로 유지해서, 실제 광고 코드를 넣을 때 페이지 흐름이 안 틀어지게 한다.
export default function AdSlot({
    label = "광고 영역",
    className = "",
  }: {
    label?: string
    className?: string
  }) {
    return (
      <div
        className={className}
        aria-hidden="true"
      />
    )
}
