import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "광고하기 — GoalLine",
  description: "GoalLine 광고 및 제휴 문의 안내입니다.",
}

export default function AdvertisePage() {
  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link href="/" className="text-xs text-floodlight/40 hover:text-score-amber mb-8 inline-block">
          ← GoalLine 홈으로
        </Link>

        <h1 className="font-display uppercase text-2xl text-score-amber mb-10">광고하기</h1>

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

        <div className="mt-12 pt-6 border-t border-turf-line/30 text-xs text-floodlight/30 text-center">
          © {new Date().getFullYear()} GoalLine. All rights reserved.
        </div>
      </div>
    </main>
  )
}
