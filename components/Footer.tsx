import Link from "next/link"

export default function Footer() {
  return (
    <footer className="border-t border-turf-line/60 mt-16">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-floodlight/40">
        <p>© 2026 Football Site. 비공식 축구 정보 서비스입니다.</p>
        <div className="flex items-center gap-5">
          <Link href="/privacy" className="hover:text-floodlight/70 transition-colors">
            개인정보처리방침
          </Link>
          <Link href="/terms" className="hover:text-floodlight/70 transition-colors">
            이용약관
          </Link>
          <Link href="/advertise" className="hover:text-floodlight/70 transition-colors">
            광고 문의
          </Link>
        </div>
      </div>
    </footer>
  )
}

<p>© 2026 GoalLine. 비공식 축구 정보 서비스입니다.</p>