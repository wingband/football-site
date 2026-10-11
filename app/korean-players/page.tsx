import type { Metadata } from "next"
import CoupangBanner from "@/components/CoupangBanner"
import Link from "next/link"
import { KOREAN_PLAYERS_ABROAD } from "@/lib/koreanPlayersAbroad"
import Logo from "@/components/Logo"
import PlayerAvatar from "@/components/PlayerAvatar"
import KoreanWeekHub from "@/components/KoreanWeekHub"
import { getKoreanPlayersWeek, koTeam } from "@/lib/koreanWeekly"
import { leagueKo } from "@/lib/koreanNames"

// 경기 일정/최근 활약 데이터는 DB 캐시(3시간)를 거치므로 페이지는 1시간마다 다시 만든다
export const revalidate = 3600

// API-Football CDN의 리그 로고는 어두운 배경에서 잘 안 보이는 것들이 있어서(특히 프리미어리그),
// 다크 테마에 맞게 준비된 로컬 흰색/고대비 에셋이 있으면 그걸 우선 쓴다
const LEAGUE_LOGO_LOCAL: Record<string, string> = {
  "Premier League": "/leagues/pl.png",
  "La Liga": "/leagues/laliga.png",
  "Bundesliga": "/leagues/bundesliga.png",
}

export const metadata: Metadata = {
  // 레이아웃 템플릿이 " | GoalLine"을 붙인다
  title: "해외파 경기 일정·결과 — 손흥민, 이강인, 김민재, 황희찬 오늘 경기",
  description: "손흥민, 이강인, 김민재, 황희찬 등 해외파 한국 선수들의 다음 경기 일정(한국 시간)과 최근 7일 경기별 출전 시간, 평점, 골·도움을 한 페이지에서 확인하세요.",
  keywords: ["해외파 경기 일정", "손흥민 오늘 경기", "이강인 경기 일정", "김민재 경기", "황희찬 경기", "해외파 평점", "한국 축구 해외파"],
  alternates: { canonical: "/korean-players" },
}

// 한국 선수별 한줄 소개 (SEO용)
const PLAYER_INTRO: Record<number, { nameKo: string; nameEn: string; desc: string }> = {
  24888: { nameKo: "황희찬", nameEn: "Hwang Hee-Chan", desc: "독일 분데스리가 샬케04에 임대 중인 공격형 미드필더 (울버햄튼 소속)" },
  927:   { nameKo: "이강인", nameEn: "Lee Kang-In", desc: "스페인 라리가 아틀레티코 마드리드 소속의 창의적인 미드필더" },
  2897:  { nameKo: "김민재", nameEn: "Kim Min-Jae", desc: "독일 분데스리가 바이에른 뮌헨의 수비 핵심, 세계 최고 센터백 중 한 명" },
  2906:  { nameKo: "이재성", nameEn: "Lee Jae-Sung", desc: "독일 분데스리가 마인츠 05의 공격형 미드필더·윙어" },
  512:   { nameKo: "정우영", nameEn: "Jeong Woo-Yeong", desc: "독일 분데스리가 유니온 베를린 소속 공격형 미드필더" },
  280358:{ nameKo: "옌스 카스트로프", nameEn: "Jens Castrop", desc: "독일 분데스리가 보루시아 묀헨글라트바흐 소속의 한국계 독일 선수" },
  357286:{ nameKo: "배준호", nameEn: "Bae Jun-Ho", desc: "잉글랜드 챔피언십 스토크 시티에서 활약 중인 차세대 기대주" },
  2909:  { nameKo: "백승호", nameEn: "Paik Seung-Ho", desc: "잉글랜드 챔피언십 버밍엄 시티 소속 미드필더" },
  237050:{ nameKo: "엄지성", nameEn: "Eom Ji-Sung", desc: "잉글랜드 챔피언십 스완지 시티 소속 공격수" },
  423708:{ nameKo: "양민혁", nameEn: "Yang Min-Hyeok", desc: "토트넘 핫스퍼 소속으로 벨기에 KVC 베스털로에 임대 중인 신예" },
  356237:{ nameKo: "김지수", nameEn: "Kim Ji-Soo", desc: "잉글랜드 프리미어리그 브렌트퍼드 소속 수비수" },
  26519: { nameKo: "홍현석", nameEn: "Hong Hyun-Seok", desc: "마인츠 소속으로 벨기에 겐트에 임대 중인 미드필더" },
  186:   { nameKo: "손흥민", nameEn: "Son Heung-Min", desc: "토트넘 레전드, 현재 MLS LAFC에서 활약 중인 한국 축구 역대 최고 스타" },
}

const LEAGUE_ORDER = ["Premier League", "La Liga", "Bundesliga", "Championship", "2. Bundesliga", "Belgian Pro League", "MLS"]

export default async function KoreanPlayersPage() {
  const weeks = await getKoreanPlayersWeek()

  const byLeague = new Map<string, typeof KOREAN_PLAYERS_ABROAD>()
  for (const p of KOREAN_PLAYERS_ABROAD) {
    if (!byLeague.has(p.league)) byLeague.set(p.league, [])
    byLeague.get(p.league)!.push(p)
  }

  const sorted = LEAGUE_ORDER
    .filter(l => byLeague.has(l))
    .map(l => ({ league: l, players: byLeague.get(l)! }))

  const CARD = "bg-turf/40 border border-turf-line/60 rounded-none p-4 sm:p-5"
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-floodlight">
      {/* 헤더 */}
      <section className={CARD}>
 <h1 className="text-xl font-display text-floodlight">🇰🇷 해외파 경기 일정 · 결과</h1>
        <p className="text-sm text-floodlight/75 leading-relaxed mt-2">
          해외 무대에서 뛰는 한국 선수들의 다음 경기 일정(한국 시간)과 최근 경기 평점·공격포인트를 한 곳에서 확인하세요.
        </p>
      </section>

      {/* 이번 주 해외파: 다음 경기 일정 + 최근 7일 활약 */}
      <KoreanWeekHub weeks={weeks} />

      {/* 선수별 소속팀 — 리그마다 한 줄씩 */}
      <section className={CARD}>
        <h2 className="text-base font-semibold text-floodlight mb-1">선수별 소속팀</h2>
        <p className="text-sm text-floodlight/70 mb-3">이름을 누르면 선수 기록 페이지로 가요</p>
        <div className="divide-y divide-turf-line/40">
          {sorted.map(({ league, players }) => (
            <div key={league} className="py-3 first:pt-0 last:pb-0 sm:flex sm:gap-4">
              <div className="flex items-center gap-2 sm:w-44 shrink-0 mb-2 sm:mb-0">
                <Logo src={LEAGUE_LOGO_LOCAL[league] ?? players[0].leagueLogo} alt="" className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-semibold text-floodlight">{leagueKo(league)}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {players.map((p) => (
                  <Link
                    key={p.id}
                    href={`/players/${p.id}`}
                    className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-turf-line text-sm text-floodlight/90 hover:border-score-amber hover:text-score-amber transition-colors"
                  >
                    <PlayerAvatar
                      src={`https://media.api-sports.io/football/players/${p.id}.png`}
                      alt={PLAYER_INTRO[p.id]?.nameKo ?? p.name}
                      className="w-7 h-7 rounded-full"
                    />
                    <span>{PLAYER_INTRO[p.id]?.nameKo ?? p.name}</span>
                    <span className="text-xs text-floodlight/60">{koTeam(p.teamName)}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SEO 텍스트 블록 */}
      <section className={CARD}>
 <h2 className="text-base font-semibold font-display text-floodlight mb-2">한국 축구 해외파 현황</h2>
        <p className="text-sm text-floodlight/70 leading-relaxed">
          현재 유럽 무대에서 활약 중인 한국 선수는 라리가의 이강인(아틀레티코 마드리드),
          분데스리가의 김민재(바이에른 뮌헨)·황희찬(샬케04)·이재성·정우영·옌스 카스트로프 등이 있습니다.
          잉글랜드에서는 김지수(브렌트퍼드)와 챔피언십의 배준호·백승호·엄지성이 뛰고 있고,
          손흥민은 MLS LAFC에서 새로운 도전을 이어가고 있습니다.
          GoalLine은 이 선수들의 매 경기 성적, 평점, 출전 시간을 실시간으로 추적합니다.
        </p>
      </section>
      <CoupangBanner />
    </main>
  )
}
