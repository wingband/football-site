import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "개인정보처리방침 — GoalLine",
  description: "GoalLine 서비스의 개인정보처리방침입니다.",
}

export default function PrivacyPage() {
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link href="/" className="text-xs text-floodlight/40 hover:text-score-amber mb-8 inline-block">
          ← GoalLine 홈으로
        </Link>

        <h1 className="font-display uppercase text-2xl text-score-amber mb-2">개인정보처리방침</h1>
        <p className="text-xs text-floodlight/40 mb-10">최종 업데이트: {today}</p>

        <div className="space-y-8 text-sm text-floodlight/80 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-floodlight mb-3">1. 개요</h2>
            <p>
              GoalLine(이하 "서비스")은 사용자의 개인정보를 소중히 여기며, 「개인정보 보호법」 및 관련 법령을 준수합니다.
              본 방침은 서비스가 수집하는 정보의 종류, 사용 방법, 보호 방법을 설명합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-floodlight mb-3">2. 수집하는 정보</h2>
            <p className="mb-2">서비스는 다음 정보를 수집할 수 있습니다:</p>
            <ul className="list-disc pl-5 space-y-1 text-floodlight/70">
              <li>방문 페이지, 체류 시간 등 사용 통계 (Google Analytics)</li>
              <li>브라우저 종류, 운영체제, 화면 해상도 등 기기 정보</li>
              <li>IP 주소 (익명 처리)</li>
              <li>즐겨찾기 리그 설정 (브라우저 로컬 스토리지에만 저장, 서버 전송 없음)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-floodlight mb-3">3. 정보 수집 방법</h2>
            <p>
              서비스는 Google Analytics 4를 통해 사이트 이용 통계를 수집합니다.
              Google Analytics는 쿠키를 사용하여 데이터를 수집하며, 개인을 식별하지 않습니다.
              Google의 데이터 처리 방침은{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
                className="text-score-amber underline">
                Google 개인정보처리방침
              </a>
              에서 확인하실 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-floodlight mb-3">4. 쿠키 사용</h2>
            <p className="mb-2">서비스는 다음 목적으로 쿠키를 사용합니다:</p>
            <ul className="list-disc pl-5 space-y-1 text-floodlight/70">
              <li>Google Analytics 통계 수집</li>
              <li>광고 게재 (Google AdSense, 향후 적용 예정)</li>
            </ul>
            <p className="mt-2">브라우저 설정에서 쿠키를 거부하거나 삭제할 수 있으나, 일부 기능이 제한될 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-floodlight mb-3">5. 광고</h2>
            <p>
              서비스는 Google AdSense를 통해 광고를 표시할 수 있습니다.
              Google은 맞춤 광고 제공을 위해 쿠키를 사용할 수 있으며,
              <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer"
                className="text-score-amber underline ml-1">
                광고 설정
              </a>
              에서 맞춤 광고를 비활성화할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-floodlight mb-3">6. 제3자 서비스</h2>
            <p className="mb-2">서비스는 다음 외부 서비스를 사용합니다:</p>
            <ul className="list-disc pl-5 space-y-1 text-floodlight/70">
              <li>API-Football — 경기 데이터 제공</li>
              <li>NewsData.io — 뉴스 기사 제공</li>
              <li>Google Analytics — 사이트 통계</li>
              <li>Vercel — 서비스 호스팅</li>
              <li>Neon — 데이터베이스 (경기 리뷰 저장)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-floodlight mb-3">7. 개인정보 보호</h2>
            <p>
              서비스는 수집한 정보를 제3자에게 판매하거나 임의로 공개하지 않습니다.
              법령에 의한 경우를 제외하고 사용자 동의 없이 개인정보를 제공하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-floodlight mb-3">8. 아동 개인정보</h2>
            <p>
              서비스는 만 14세 미만 아동을 대상으로 하지 않으며,
              아동의 개인정보를 의도적으로 수집하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-floodlight mb-3">9. 방침 변경</h2>
            <p>
              본 개인정보처리방침은 변경될 수 있으며, 변경 시 이 페이지에 최신 내용이 반영됩니다.
              정기적으로 확인하시기를 권장합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-floodlight mb-3">10. 문의</h2>
            <p>
              개인정보 관련 문의사항은 사이트 내 문의 경로를 통해 연락해 주세요.
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
