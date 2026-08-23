import Link from "next/link"

export default function Footer() {
  return (
    <footer className="border-t border-turf-line/60 mt-16">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-floodlight/40">
        <p>© {new Date().getFullYear()} GoalLine. 비공식 축구 정보 서비스입니다.</p>
        <div className="flex items-center gap-5">
          <Link href="/privacy" className="hover:text-floodlight/70 transition-colors">
            개인정보처리방침
          </Link>
        </div>
      </div>
    </footer>
  )
}
