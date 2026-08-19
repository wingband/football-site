import Link from "next/link"

export default function ComingSoon({ title, desc }: { title: string; desc: string }) {
  return (
    <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
      <div className="max-w-md mx-auto text-center pt-24">
        <h1 className="font-display uppercase text-2xl text-score-amber mb-3">{title}</h1>
        <p className="text-floodlight/50 text-sm leading-relaxed">{desc}</p>
        <Link
          href="/matches"
          className="inline-block mt-8 text-sm text-floodlight/60 hover:text-score-amber transition-colors"
        >
          ← 경기 목록으로
        </Link>
      </div>
    </main>
  )
}