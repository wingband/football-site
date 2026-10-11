import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  alternates: { canonical: "/company" },
  title: "회사소개 — GoalLine",
  description: "GoalLine 서비스 소개입니다.",
}

export default function CompanyPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-floodlight">
      <div className="bg-turf/40 border border-turf-line/60 rounded-none p-4 sm:p-5 space-y-6">
        <Link href="/" className="text-xs text-floodlight/50 hover:text-score-amber inline-block">
          ← GoalLine 홈으로
        </Link>

        <h1 className="text-xl font-bold text-floodlight">회사소개</h1>

        <div className="space-y-8 text-sm text-floodlight/80 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-floodlight mb-3">GoalLine은</h2>
            <p>
              전 세계 축구 리그의 실시간 스코어, 순위표, 경기 분석을 한곳에서
              볼 수 있도록 만든 축구 정보 서비스입니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-floodlight mb-3">해외파 트래커</h2>
            <p>
              해외에서 뛰는 한국 선수들의 소식을 놓치지 않도록, 소속팀 경기 결과와
              개인 기록을 꾸준히 업데이트하는 데 특히 신경 쓰고 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-floodlight mb-3">데이터 제공</h2>
            <p className="mb-2">표시되는 정보는 다음 서비스를 통해 제공받습니다:</p>
            <ul className="list-disc pl-5 space-y-1 text-floodlight/70">
              <li>API-Football — 경기 데이터, 순위표, 선수 기록</li>
              <li>NewsData.io — 뉴스 기사</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-floodlight mb-3">안내</h2>
            <p>
              GoalLine은 개인이 운영하는 비공식 서비스이며, 각 축구 리그·구단·선수와
              공식적인 제휴 관계가 없습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-floodlight mb-3">문의</h2>
            <p>서비스 관련 문의사항은 아래 이메일로 연락해 주세요.</p>
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
