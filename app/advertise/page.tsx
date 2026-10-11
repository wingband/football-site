import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  alternates: { canonical: "/advertise" },
  title: "광고하기 — GoalLine",
  description: "한국 축구 팬에게 도달하고 싶은 브랜드를 위한 GoalLine 광고·제휴 안내입니다.",
}

const AUDIENCE = [
  { title: "관심사가 분명한 방문자", desc: "경기 결과, 순위, 해외파 선수 기록을 찾아 들어오는 축구 팬이 중심입니다. 콘텐츠와 맥락이 맞는 광고에 적합합니다." },
  { title: "경기 일정에 따른 방문 패턴", desc: "축구 서비스 특성상 경기가 있는 날에 방문이 늘고, 경기 직후 결과·리뷰·칼럼을 찾는 흐름이 생깁니다. 구체적인 방문 통계는 문의 시 공유해 드립니다." },
  { title: "모바일과 PC 모두", desc: "모바일 화면과 PC 화면에 맞춘 레이아웃을 제공하며, 광고 크기도 기기별로 최적화되어 노출됩니다." },
]

const FORMATS = [
  { title: "배너 광고", desc: "페이지 상단 등 눈에 잘 띄는 위치의 이미지 배너. PC와 모바일 규격을 각각 준비합니다." },
  { title: "콘텐츠 제휴", desc: "축구 용품·미디어·서비스 브랜드와의 공동 기획, 이벤트·프로모션 소개 등 협의형 제휴입니다." },
  { title: "스폰서 문구·링크", desc: "특정 코너(예: 해외파 트래커, 경기 일정) 단위의 후원 표기와 링크 노출을 협의할 수 있습니다." },
]

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-1 gap-3 border-t border-turf-line/50 pt-5 md:grid-cols-[200px_minmax(0,1fr)] md:gap-8">
      <h2 className="text-base font-semibold text-floodlight">{title}</h2>
      <div className="text-sm text-floodlight/80 leading-relaxed break-keep space-y-3">{children}</div>
    </section>
  )
}

export default function AdvertisePage() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8 text-floodlight">
      <header>
        <h1 className="text-xl font-bold text-floodlight">광고하기</h1>
        <p className="text-sm text-floodlight/75 mt-2 max-w-4xl leading-relaxed break-keep">
          GoalLine은 축구를 즐겨 보는 방문자에게 도달하고 싶은 브랜드와 파트너십을 열어두고 있습니다.
          콘텐츠와 결이 맞는 광고를 통해 광고주에게는 정확한 타깃을, 방문자에게는 불편하지 않은 경험을 드리는 것이 목표입니다.
        </p>
      </header>

      <Row title="GoalLine의 방문자">
        <ul className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-3">
          {AUDIENCE.map((a) => (
            <li key={a.title}>
              <p className="font-semibold text-floodlight">{a.title}</p>
              <p className="mt-1 text-floodlight/70">{a.desc}</p>
            </li>
          ))}
        </ul>
      </Row>

      <Row title="협의 가능한 형태">
        <ul className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-3">
          {FORMATS.map((f) => (
            <li key={f.title}>
              <p className="font-semibold text-floodlight">{f.title}</p>
              <p className="mt-1 text-floodlight/70">{f.desc}</p>
            </li>
          ))}
        </ul>
      </Row>

      <Row title="현재 상태">
        <p>
          직접 판매하는 광고 상품은 현재 준비 중입니다. 지금은 광고 플랫폼(카카오 애드핏)과 제휴 프로그램(쿠팡 파트너스)을 통해 광고가 노출되고 있습니다.
          단가·노출 위치·기간 등 구체적인 조건은 문의를 주시면 목적에 맞게 협의해 안내드립니다.
        </p>
      </Row>

      <Row title="광고 운영 원칙">
        <ul className="list-disc pl-5 space-y-1.5 text-floodlight/75">
          <li>광고는 본문과 구분되도록 표시하며, 콘텐츠를 가리거나 오인하게 만드는 형태는 받지 않습니다.</li>
          <li>도박·사행성, 성인, 불법 서비스, 허위·과장 광고는 게재하지 않습니다.</li>
          <li>제휴 수익이 발생하는 링크는 그 사실을 함께 안내합니다.</li>
        </ul>
      </Row>

      <Row title="문의 방법">
        <p>아래 내용을 함께 보내 주시면 더 빠르게 안내드릴 수 있습니다.</p>
        <ol className="list-decimal pl-5 space-y-1 text-floodlight/75">
          <li>회사(브랜드)명과 담당자 연락처</li>
          <li>광고하려는 상품·서비스와 목표(인지도, 유입, 전환 등)</li>
          <li>희망 형태(배너, 콘텐츠 제휴, 스폰서 등)와 예상 기간·예산</li>
        </ol>
        <p>
          <a href="mailto:the_activity@naver.com" className="text-score-amber underline">
            the_activity@naver.com
          </a>
        </p>
        <p className="text-floodlight/65">
          서비스 전반에 대한 소개는 <Link href="/company" className="text-score-amber underline">회사소개</Link>에서 확인하실 수 있습니다.
        </p>
      </Row>
    </main>
  )
}
