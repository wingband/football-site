import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  alternates: { canonical: "/company" },
  title: "회사소개 — GoalLine",
  description: "GoalLine은 한국 축구 팬을 위한 경기 결과·순위·해외파 선수 기록·칼럼 서비스입니다. 서비스 소개와 운영 원칙, 데이터 출처를 안내합니다.",
}

const FEATURES = [
  { title: "해외파 트래커", href: "/korean-players", desc: "해외에서 뛰는 한국 선수들의 소속팀 경기 결과, 출전 시간, 평점과 공격 포인트를 선수별로 모아 보여줍니다." },
  { title: "경기 일정·결과", href: "/matches", desc: "주요 리그의 일정과 실시간 스코어, 종료된 경기의 결과를 날짜별로 확인할 수 있습니다." },
  { title: "리그 순위표", href: "/standings", desc: "프리미어리그, 라리가, 분데스리가, 세리에A, 리그1, K리그1, J리그의 순위와 최근 5경기 폼, 득점·도움 순위를 제공합니다." },
  { title: "경기 리뷰", href: "/stories", desc: "종료된 경기를 스코어와 흐름 중심으로 정리해, 놓친 경기도 빠르게 따라잡을 수 있게 합니다." },
  { title: "칼럼", href: "/columns", desc: "경기 리포트, K리그 라운드 정리, 주간 해외파 활약 등 숫자 뒤에 있는 이야기를 정리해 소개합니다." },
  { title: "게시판", href: "/board", desc: "축구 팬들이 경기와 선수, 리그에 대한 생각을 자유롭게 나누는 커뮤니티 공간입니다." },
]

const PRINCIPLES = [
  { title: "정확한 데이터", desc: "점수와 기록은 공신력 있는 외부 데이터 제공처의 값을 기준으로 표시하며, 출처가 불분명한 수치는 싣지 않습니다." },
  { title: "한국 팬의 시선", desc: "팀·선수·리그 이름을 한국어로 통일해 표기하고, 한국인 선수의 소식을 우선해서 다룹니다." },
  { title: "광고와 콘텐츠의 구분", desc: "광고와 제휴 링크는 본문과 구분되도록 표시하고, 제휴 수익이 발생하는 경우 그 사실을 명시합니다." },
  { title: "오류에는 빠르게 대응", desc: "잘못된 정보가 있으면 문의 메일로 알려주시는 대로 확인하고 바로잡습니다." },
]

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-1 gap-3 border-t border-turf-line/50 pt-5 md:grid-cols-[200px_minmax(0,1fr)] md:gap-8">
      <h2 className="text-base font-semibold text-floodlight">{title}</h2>
      <div className="text-sm text-floodlight/80 leading-relaxed break-keep space-y-3">{children}</div>
    </section>
  )
}

export default function CompanyPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8 text-floodlight">
      <header>
        <h1 className="text-xl font-bold text-floodlight">회사소개</h1>
        <p className="text-sm text-floodlight/75 mt-2 leading-relaxed break-keep">
          GoalLine은 한국 축구 팬을 위한 정보 서비스입니다. 흩어져 있는 경기 결과와 순위, 해외파 선수의 기록을 한곳에 모으고,
          숫자만으로는 보이지 않는 이야기를 칼럼으로 풀어냅니다.
        </p>
      </header>

      <Row title="서비스 소개">
        <p>
          축구를 좋아하는 사람이라면 누구나 경기 결과를 찾고, 응원하는 선수의 소식을 확인하고, 다른 팬과 이야기를 나누고 싶어 합니다.
          GoalLine은 이 세 가지를 한 사이트에서 해결하는 것을 목표로 합니다.
        </p>
        <p>
          특히 해외에서 활약하는 한국 선수들의 소식을 놓치지 않도록, 소속팀 경기 결과와 개인 기록을 꾸준히 업데이트하는 데 가장 신경 쓰고 있습니다.
        </p>
      </Row>

      <Row title="제공하는 서비스">
        <ul className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <Link href={f.href} className="font-semibold text-floodlight hover:text-score-amber">
                {f.title} →
              </Link>
              <p className="mt-1 text-floodlight/70">{f.desc}</p>
            </li>
          ))}
        </ul>
      </Row>

      <Row title="운영 원칙">
        <ul className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <li key={p.title}>
              <p className="font-semibold text-floodlight">{p.title}</p>
              <p className="mt-1 text-floodlight/70">{p.desc}</p>
            </li>
          ))}
        </ul>
      </Row>

      <Row title="데이터 출처">
        <p>서비스에 표시되는 정보는 다음 외부 서비스를 통해 제공받습니다.</p>
        <ul className="list-disc pl-5 space-y-1 text-floodlight/75">
          <li>API-Football — 경기 일정·결과, 순위표, 선수 기록, 팀 정보</li>
          <li>NewsData.io — 축구 관련 뉴스 기사</li>
        </ul>
        <p className="text-floodlight/65">
          외부 데이터는 제공처의 사정이나 집계 시점에 따라 실제와 다소 차이가 있을 수 있으며, 경기 직후에는 기록이 정정될 수 있습니다.
        </p>
      </Row>

      <Row title="운영 안내">
        <p>
          GoalLine은 개인이 운영하는 비공식 서비스이며, 각 축구 리그·구단·선수와 공식적인 제휴 관계가 없습니다.
          구단 및 리그의 엠블럼, 선수 이미지 등은 해당 권리자에게 저작권이 있으며 정보 제공 목적으로만 사용합니다.
        </p>
        <p>
          사이트 운영 비용은 광고 수익으로 충당합니다. 일부 링크는 쿠팡 파트너스 활동의 일환으로, 이를 통해 일정 수수료를 제공받을 수 있습니다.
        </p>
        <p>
          운영 정책과 개인정보 처리 기준은 <Link href="/privacy" className="text-score-amber underline">개인정보처리방침</Link>에서 확인하실 수 있습니다.
        </p>
      </Row>

      <Row title="문의">
        <p>서비스 이용 중 불편한 점, 데이터 오류 제보, 제휴·광고 문의는 아래 이메일로 보내 주세요. 확인 후 순차적으로 답변드립니다.</p>
        <p>
          <a href="mailto:the_activity@naver.com" className="text-score-amber underline">
            the_activity@naver.com
          </a>
        </p>
        <p className="text-floodlight/65">
          광고 문의는 <Link href="/advertise" className="text-score-amber underline">광고하기</Link> 페이지를 참고해 주세요.
        </p>
      </Row>
    </main>
  )
}
