import type { Metadata } from "next"
import Link from "next/link"
import { KOREAN_PLAYERS_ABROAD } from "@/lib/koreanPlayersAbroad"
import Logo from "@/components/Logo"
import PlayerAvatar from "@/components/PlayerAvatar"

export const metadata: Metadata = {
  title: "해외파 한국 축구 선수 — 황희찬, 이강인, 김민재, 손흥민 | GoalLine",
  description: "황희찬(울버햄튼), 이강인(아틀레티코), 김민재(바이에른), 손흥민(LAFC) 등 해외에서 활약 중인 한국 축구 선수들의 최신 시즌 성적과 소속팀 정보를 한눈에 확인하세요.",
  keywords: ["황희찬", "이강인", "김민재", "손흥민", "정우영", "이재성", "한국 축구 해외파", "해외 한국선수"],
}

// 한국 선수별 한줄 소개 (SEO용)
const PLAYER_INTRO: Record<number, { nameKo: string; nameEn: string; desc: string }> = {
  24888: { nameKo: "황희찬", nameEn: "Hwang Hee-Chan", desc: "잉글랜드 프리미어리그 울버햄튼에서 활약 중인 공격형 미드필더" },
  927:   { nameKo: "이강인", nameEn: "Lee Kang-In", desc: "스페인 라리가 아틀레티코 마드리드 소속의 창의적인 미드필더" },
  2897:  { nameKo: "김민재", nameEn: "Kim Min-Jae", desc: "독일 분데스리가 바이에른 뮌헨의 수비 핵심, 세계 최고 센터백 중 한 명" },
  2906:  { nameKo: "이재성", nameEn: "Lee Jae-Sung", desc: "독일 분데스리가 마인츠 05의 공격형 미드필더·윙어" },
  512:   { nameKo: "정우영", nameEn: "Jeong Woo-Yeong", desc: "독일 분데스리가 유니온 베를린 소속 공격형 미드필더" },
  280358:{ nameKo: "옌스 카스트로프", nameEn: "Jens Castrop", desc: "독일 분데스리가 보루시아 묀헨글라트바흐 소속의 한국계 독일 선수" },
  357286:{ nameKo: "배준호", nameEn: "Bae Jun-Ho", desc: "잉글랜드 챔피언십 스토크 시티에서 활약 중인 차세대 기대주" },
  2909:  { nameKo: "백승호", nameEn: "Paik Seung-Ho", desc: "잉글랜드 챔피언십 버밍엄 시티 소속 미드필더" },
  237050:{ nameKo: "엄지성", nameEn: "Eom Ji-Sung", desc: "잉글랜드 챔피언십 스완지 시티 소속 공격수" },
  423708:{ nameKo: "양민혁", nameEn: "Yang Min-Hyeok", desc: "토트넘 핫스퍼 소속으로 포츠머스에 임대 중인 신예" },
  356237:{ nameKo: "김지수", nameEn: "Kim Ji-Soo", desc: "브렌트퍼드 소속으로 독일 카이저슬라우테른에 임대 중인 수비수" },
  26519: { nameKo: "홍현석", nameEn: "Hong Hyun-Seok", desc: "마인츠 소속으로 벨기에 겐트에 임대 중인 미드필더" },
  186:   { nameKo: "손흥민", nameEn: "Son Heung-Min", desc: "토트넘 레전드, 현재 MLS LAFC에서 활약 중인 한국 축구 역대 최고 스타" },
}

const LEAGUE_ORDER = ["Premier League", "La Liga", "Bundesliga", "Championship", "2. Bundesliga", "Belgian Pro League", "MLS"]

function getLeagueFlag(league: string) {
  if (league.includes("Premier") || league.includes("Championship") || league.includes("FA Cup")) return "🏴󠁧󠁢󠁥󠁮󠁧󠁿"
  if (league.includes("La Liga")) return "🇪🇸"
  if (league.includes("Bundesliga")) return "🇩🇪"
  if (league.includes("Belgian")) return "🇧🇪"
  if (league === "MLS") return "🇺🇸"
  return "🌍"
}

export default function KoreanPlayersPage() {
  const byLeague = new Map<string, typeof KOREAN_PLAYERS_ABROAD>()
  for (const p of KOREAN_PLAYERS_ABROAD) {
    if (!byLeague.has(p.league)) byLeague.set(p.league, [])
    byLeague.get(p.league)!.push(p)
  }

  const sorted = LEAGUE_ORDER
    .filter(l => byLeague.has(l))
    .map(l => ({ league: l, players: byLeague.get(l)! }))

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-3xl mx-auto px-4 pb-16">

        {/* 헤더 */}
        <div className="pt-8 pb-6 border-b border-turf-line/40">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🇰🇷</span>
            <h1 className="font-display uppercase text-2xl text-score-amber">
              해외파 한국 축구 선수
            </h1>
          </div>
          <p className="text-sm text-floodlight/50 leading-relaxed">
            유럽 5대 리그를 비롯한 해외 무대에서 활약 중인 한국 국가대표 선수들의
            소속팀·리그 정보와 시즌 성적을 실시간으로 확인하세요.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {KOREAN_PLAYERS_ABROAD.map(p => (
              <Link key={p.id} href={`/players/${p.id}`}
                className="text-xs bg-turf-line/30 hover:bg-score-amber/20 hover:text-score-amber px-2.5 py-1 rounded-full transition-colors">
                {PLAYER_INTRO[p.id]?.nameKo ?? p.name}
              </Link>
            ))}
          </div>
        </div>

        {/* 리그별 선수 목록 */}
        <div className="space-y-8 mt-8">
          {sorted.map(({ league, players }) => (
            <section key={league}>
              <div className="flex items-center gap-2 mb-4">
                <span>{getLeagueFlag(league)}</span>
                <h2 className="font-display uppercase text-base text-floodlight/80 tracking-wide">
                  {league}
                </h2>
                <span className="text-xs text-floodlight/30 ml-1">{players.length}명</span>
              </div>

              <div className="space-y-3">
                {players.map(p => {
                  const intro = PLAYER_INTRO[p.id]
                  return (
                    <Link key={p.id} href={`/players/${p.id}`}
                      className="flex items-start gap-4 bg-turf/40 border border-turf-line/40 p-4 hover:border-score-amber/50 hover:bg-turf-line/20 transition-colors group">

                      {/* 선수 사진 */}
                      <PlayerAvatar
                        src={`https://media.api-sports.io/football/players/${p.id}.png`}
                        alt={intro?.nameKo ?? p.name}
                        className="w-14 h-14 rounded-full object-cover bg-turf-line shrink-0"
                      />

                      {/* 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold group-hover:text-score-amber transition-colors">
                            {intro?.nameKo ?? p.name}
                          </h3>
                          {intro?.nameEn && (
                            <span className="text-xs text-floodlight/40">{intro.nameEn}</span>
                          )}
                        </div>

                        {/* 소속팀 */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <Logo src={p.teamLogo} alt="" className="w-4 h-4 shrink-0" />
                          <span className="text-sm font-semibold text-score-amber">{p.teamName}</span>
                          <span className="text-floodlight/30 text-xs">·</span>
                          <Logo src={p.leagueLogo} alt="" className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xs text-floodlight/50">{p.league}</span>
                        </div>

                        {/* 한줄 소개 */}
                        {intro?.desc && (
                          <p className="text-xs text-floodlight/50 mt-1.5 leading-relaxed">
                            {intro.desc}
                          </p>
                        )}
                      </div>

                      <span className="text-floodlight/30 text-sm group-hover:text-score-amber transition-colors shrink-0">→</span>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        {/* SEO 텍스트 블록 */}
        <section className="mt-12 pt-8 border-t border-turf-line/30">
          <h2 className="font-semibold text-base text-floodlight/80 mb-3">한국 축구 해외파 현황</h2>
          <p className="text-sm text-floodlight/50 leading-relaxed">
            현재 유럽 무대에서 활약 중인 한국 선수는 프리미어리그의 황희찬, 라리가의 이강인,
            분데스리가의 김민재·이재성·정우영·옌스 카스트로프 등이 있습니다.
            챔피언십에서는 배준호(스토크), 백승호(버밍엄), 엄지성(스완지), 양민혁(포츠머스)이
            뛰고 있으며, 손흥민은 MLS LAFC에서 새로운 도전을 이어가고 있습니다.
            GoalLine은 이 선수들의 매 경기 성적, 평점, 출전 시간을 실시간으로 추적합니다.
          </p>
        </section>
      </div>
    </main>
  )
}
