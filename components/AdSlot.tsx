// 광고가 들어갈 자리를 미리 잡아두는 컴포넌트.
// 지금은 자리만 표시하고, 나중에 애드센스(또는 다른 광고 코드)를 이 안에 넣으면 됩니다.
export default function AdSlot({
    label = "광고 영역",
    className = "",
  }: {
    label?: string
    className?: string
  }) {
    return (
      <div
        className={`flex items-center justify-center rounded-md bg-turf/20 border border-dashed border-turf-line/50 text-floodlight/20 text-[11px] font-data ${className}`}
      >
        {label}
      </div>
    )
  }