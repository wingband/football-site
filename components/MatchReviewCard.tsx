export default function MatchReviewCard({
  headline,
  summary,
  homeLogo,
  awayLogo,
}: {
  headline: string
  summary: string
  homeLogo: string
  awayLogo: string
}) {
  return (
    <div className="bg-turf/40 border-l-2 border-score-amber p-5">
      <h3 className="font-display uppercase tracking-wide text-sm text-floodlight/70 mb-4">
        Match review
      </h3>
      <div className="flex gap-4">
        <div className="relative w-20 h-20 shrink-0 overflow-hidden bg-turf-line/40">
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
        <div className="min-w-0">
          <p className="font-medium text-[15px] leading-snug text-floodlight">{headline}</p>
          <p className="text-sm text-floodlight/50 mt-1.5 leading-relaxed">{summary}</p>
        </div>
      </div>
    </div>
  )
}
