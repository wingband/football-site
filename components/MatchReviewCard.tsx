import Link from "next/link"

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
    <div className="border border-score-amber/40 bg-score-amber/5 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-5 py-3 bg-score-amber/10 border-b border-score-amber/20">
        <span className="text-score-amber text-xs">✦</span>
        <h3 className="font-display uppercase tracking-widest text-xs text-score-amber font-bold">
          Match Review
        </h3>
        <span className="text-score-amber text-xs ml-auto">AI 작성</span>
      </div>

      {/* 본문 */}
      <div className="flex gap-4 p-5">
        <div className="relative w-20 h-20 shrink-0 overflow-hidden bg-turf-line/40 rounded">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(80% 80% at 30% 30%, rgba(245,185,66,0.18), transparent 60%), radial-gradient(80% 80% at 70% 70%, rgba(36,73,46,0.6), transparent 60%)",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center gap-1">
            <img src={homeLogo} alt="" className="w-9 h-9 -mr-2" />
            <img src={awayLogo} alt="" className="w-9 h-9 -ml-2" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
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
      </div>
    </div>
  )
}
