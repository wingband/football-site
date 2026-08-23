import Link from "next/link"

// Section 컴포넌트와 같은 프레임(좌측 앰버 세로바 + 헤더 헤어라인 + px-5 py-5 본문)을 쓰고,
// 앰버 배경으로만 "AI 리뷰" 카드임을 구분한다.
// 팀 로고는 헤더로 올려서 본문 텍스트가 카드 전체 폭을 쓰게 함
export default function MatchReviewCard({
  headline,
  summary,
  homeLogo,
  awayLogo,
  storySlug,
}: {
  headline: string
  summary: string
  homeLogo: string
  awayLogo: string
  storySlug?: string | null
}) {
  return (
    <section className="bg-score-amber/5 border-l-2 border-score-amber mt-5">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-5 py-3 bg-score-amber/10 border-b border-score-amber/20">
        <span className="text-score-amber text-xs">✦</span>
        <h2 className="font-display uppercase tracking-widest text-xs text-score-amber font-bold">
          Match Review
        </h2>
        <span className="flex items-center ml-1.5">
          <img src={homeLogo} alt="" className="w-5 h-5" />
          <img src={awayLogo} alt="" className="w-5 h-5 -ml-1.5" />
        </span>
        <span className="text-score-amber text-xs ml-auto shrink-0">AI 작성</span>
      </div>

      {/* 본문 */}
      <div className="px-5 py-5">
        <p className="font-semibold text-[15px] leading-snug text-floodlight mb-2">{headline}</p>
        <p className="text-sm text-floodlight/65 leading-relaxed">{summary}</p>
        {storySlug && (
          <Link
            href={`/stories/${storySlug}`}
            className="inline-block mt-3 text-xs text-score-amber hover:underline"
          >
            전체 리뷰 읽기 →
          </Link>
        )}
      </div>
    </section>
  )
}
