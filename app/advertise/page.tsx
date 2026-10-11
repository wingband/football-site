import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  alternates: { canonical: "/advertise" },
  title: "광고하기 — GoalLine",
  description: "GoalLine 광고 및 제휴 문의 안내입니다.",
}

export default function AdvertisePage() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-floodlight">
      <div className="bg-turf/40 border border-turf-line/60 rounded-none p-4 sm:p-5 space-y-6">
        <Link href="/" className="text-xs text-floodlight/50 hover:text-score-amber inline-block">
          ← GoalLine 홈으로
        </Link>

        <h1 className="text-xl font-bold text-floodlight">광고하기</h1>

        <div className="space-y-8 text-sm text-floodlight/80 leading-relaxed">

          <section>
            <p>
              GoalLine은 축구를 즐겨 보는 방문자들에게 도달하고 싶은 브랜드와
              파트너십을 열어두고 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-floodlight mb-3">현재 상태</h2>
            <p>
              광고 상품은 현재 준비 중입니다. 배너 광고 등 구체적인 제휴 문의는
              아래 이메일로 연락해 주시면 확인 후 안내드리겠습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-floodlight mb-3">문의</h2>
            <p className="mt-2">
              <a href="mailto:the_activity@naver.com" className="text-score-amber underline">
                the_activity@naver.com
              </a>
            </p>
          </section>

        </div>
      </div>
    </main>
  )
}
