type SectionProps = {
    title: string
    children: React.ReactNode
  }
  
  // 경기 상세 페이지 전체에서 재사용하는 카드 wrapper.
  // 왼쪽 앰버색 세로 바 + 하단 헤어라인으로 "방송 그래픽 패키지" 느낌을 냄
  export default function Section({ title, children }: SectionProps) {
    return (
      <section className="bg-turf/40 border-l-2 border-score-amber mt-5">
        <div className="px-5 py-3 border-b border-turf-line/60">
          <h2 className="font-display uppercase tracking-wide text-sm text-floodlight/70">
            {title}
          </h2>
        </div>
        <div className="px-5 py-5">{children}</div>
      </section>
    )
  }