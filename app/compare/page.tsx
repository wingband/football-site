export const dynamic = 'force-dynamic'

import type { Metadata } from "next"
import Link from "next/link"
import AdSlot from "@/components/AdSlot"
import PlayerAvatar from "@/components/PlayerAvatar"
import PlayerCompareSearch from "@/components/PlayerCompareSearch"
import { getPlayerDataWithFallback, type PlayerData, type PlayerSeasonStat } from "@/lib/playerData"
import { getSeasonYear } from "@/lib/season"
import { KOREAN_PLAYERS_ABROAD } from "@/lib/koreanPlayersAbroad"
import {
  COMPARE_METRICS,
  compareHref,
  compareValueClass,
  displayPlayerName,
  pickPrimaryStat,
} from "@/lib/compare"

function parseId(raw: string | undefined): number | null {
  if (!raw) return null
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

async function loadPlayer(id: number | null): Promise<PlayerData | null> {
  if (id === null) return null
  return getPlayerDataWithFallback(String(id), getSeasonYear("England"))
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ player1?: string; player2?: string }>
}): Promise<Metadata> {
  const sp = await searchParams
  const id1 = parseId(sp.player1)
  const id2 = parseId(sp.player2)

  if (id1 === null || id2 === null) {
    return {
      title: "선수 비교",
      description: "두 선수의 평점, 골, 도움, 패스 성공률, 드리블 등 시즌 기록을 나란히 비교해보세요.",
      alternates: { canonical: "/compare" },
    }
  }

  const [p1, p2] = await Promise.all([loadPlayer(id1), loadPlayer(id2)])
  const name1 = p1 ? displayPlayerName(id1, p1.player.name) : null
  const name2 = p2 ? displayPlayerName(id2, p2.player.name) : null

  if (!name1 || !name2) {
    return { title: "선수 비교", alternates: { canonical: "/compare" } }
  }

  return {
    // 레이아웃 템플릿("%s | GoalLine")이 뒤에 사이트명을 붙여준다
    title: `${name1} vs ${name2} 비교`,
    description: `${name1}과 ${name2}의 시즌 기록을 나란히 비교합니다. 평점, 골, 도움, 출전 시간, 패스 성공률, 드리블 성공률까지 한눈에 확인하세요.`,
    // 순서만 바꾼 URL이 중복 색인되지 않도록 id 오름차순 주소를 정규 URL로 지정
    alternates: { canonical: compareHref(id1, id2) },
    openGraph: {
      title: `${name1} vs ${name2} 비교 | GoalLine`,
      description: `${name1} vs ${name2} — 시즌 기록 상세 비교`,
      type: "website",
    },
  }
}

function PlayerHeader({
  data,
  id,
  stat,
}: {
  data: PlayerData
  id: number
  stat: PlayerSeasonStat | null
}) {
  const name = displayPlayerName(id, data.player.name)
  return (
    <div className="flex flex-col items-center text-center px-2 py-4">
      <PlayerAvatar
        src={data.player.photo}
        alt={name}
        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover bg-turf-line text-xl"
      />
      <Link
        href={`/players/${id}`}
        className="mt-3 font-display uppercase text-base sm:text-lg text-floodlight hover:text-score-amber transition-colors"
      >
        {name}
      </Link>
      {/* 로마자 이름도 같이 — 한국어 이름으로 바꿔 표시한 선수는 원래 표기를 알기 어려움 */}
      {name !== data.player.name && (
        <span className="text-[11px] text-floodlight/35 mt-0.5">{data.player.name}</span>
      )}

      {stat ? (
        <>
          <div className="flex items-center gap-1.5 mt-2">
            <img src={stat.team.logo} alt="" className="w-4 h-4 shrink-0" />
            <span className="text-xs text-score-amber font-semibold truncate">{stat.team.name}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <img src={stat.league.logo} alt="" className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] text-floodlight/50 truncate">{stat.league.name}</span>
          </div>
        </>
      ) : (
        <span className="text-[11px] text-floodlight/40 mt-2">시즌 기록 없음</span>
      )}
    </div>
  )
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ player1?: string; player2?: string }>
}) {
  const sp = await searchParams
  const id1 = parseId(sp.player1)
  const id2 = parseId(sp.player2)

  const [p1, p2] = await Promise.all([loadPlayer(id1), loadPlayer(id2)])

  const stat1 = p1 ? pickPrimaryStat(p1.statistics) : null
  const stat2 = p2 ? pickPrimaryStat(p2.statistics) : null

  const name1 = p1 && id1 ? displayPlayerName(id1, p1.player.name) : null
  const name2 = p2 && id2 ? displayPlayerName(id2, p2.player.name) : null

  const bothLoaded = p1 !== null && p2 !== null && id1 !== null && id2 !== null

  // 아직 고르지 않았을 때 보여줄 추천 조합 (내부 링크로 색인에도 도움)
  const suggestions = KOREAN_PLAYERS_ABROAD.filter((p) => p.tier === 1).slice(0, 5)
  const sonId = 186

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-3xl mx-auto pb-16 px-4">
        <div className="pt-8 pb-5">
          <h1 className="font-display uppercase text-2xl">
            {bothLoaded ? `${name1} vs ${name2}` : "선수 비교"}
          </h1>
          <p className="text-sm text-floodlight/50 mt-1.5">
            {bothLoaded
              ? "두 선수의 시즌 기록을 나란히 비교합니다. 더 높은 값이 골드로 표시됩니다."
              : "두 선수를 검색해서 시즌 기록을 나란히 비교해보세요."}
          </p>
        </div>

        <PlayerCompareSearch
          player1Id={id1}
          player2Id={id2}
          player1Name={name1}
          player2Name={name2}
        />

        <AdSlot label="비교 페이지 배너 광고 (예: 728x90)" className="w-full h-16 my-5" />

        {/* 선수를 다 고르지 않은 상태 — 추천 조합 안내 */}
        {!bothLoaded && (
          <section className="mt-2">
            {(id1 !== null || id2 !== null) && (
              <p className="text-sm text-floodlight/50 mb-4">
                {id1 !== null && p1 === null
                  ? "선수 1의 정보를 찾을 수 없습니다. 다시 검색해주세요."
                  : id2 !== null && p2 === null
                    ? "선수 2의 정보를 찾을 수 없습니다. 다시 검색해주세요."
                    : "비교할 나머지 한 명을 검색해주세요."}
              </p>
            )}

            <h2 className="font-display uppercase text-sm text-floodlight/60 mb-2">추천 비교</h2>
            <div className="bg-turf/40 border-l-2 border-score-amber">
              {suggestions
                .filter((p) => p.id !== sonId)
                .map((p) => (
                  <Link
                    key={p.id}
                    href={compareHref(p.id, sonId)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-score-amber/10 border-b border-turf-line/40 last:border-b-0 transition-colors"
                  >
                    <img src={p.teamLogo} alt="" className="w-5 h-5 shrink-0" />
                    <span className="text-sm">{p.name} vs 손흥민</span>
                    <span className="text-xs text-floodlight/40 ml-auto">{p.league}</span>
                  </Link>
                ))}
            </div>
          </section>
        )}

        {/* 비교 본문 */}
        {bothLoaded && (
          <section>
            {/* 선수 카드 두 장 */}
            <div className="grid grid-cols-2 gap-2 bg-turf/40 border border-turf-line/50">
              <PlayerHeader data={p1} id={id1} stat={stat1} />
              <PlayerHeader data={p2} id={id2} stat={stat2} />
            </div>

            {/* 서로 다른 대회 기록을 비교할 수 있으니 기준을 밝혀둔다 */}
            {stat1 && stat2 && stat1.league.name !== stat2.league.name && (
              <p className="text-[11px] text-floodlight/40 mt-2 leading-relaxed">
                두 선수의 소속 대회가 다릅니다 ({stat1.league.name} · {stat2.league.name}).
                리그 수준이 달라 단순 수치 비교에는 한계가 있습니다.
              </p>
            )}

            {stat1 && stat2 ? (
              <div className="mt-4 bg-turf/40 border border-turf-line/50">
                {COMPARE_METRICS.map((m) => {
                  const v1 = m.value(stat1)
                  const v2 = m.value(stat2)
                  return (
                    <div
                      key={m.label}
                      className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-turf-line/30 last:border-b-0"
                    >
                      <span className={`text-right text-sm font-data ${compareValueClass(v1, v2)}`}>
                        {v1 === null ? "–" : m.format(v1)}
                      </span>
                      <span className="text-[11px] sm:text-xs text-floodlight/40 text-center px-2 min-w-[92px] sm:min-w-[120px]">
                        {m.label}
                      </span>
                      <span className={`text-left text-sm font-data ${compareValueClass(v2, v1)}`}>
                        {v2 === null ? "–" : m.format(v2)}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-floodlight/40 mt-6">
                두 선수 중 한 명 이상의 시즌 기록이 없어 비교할 수 없습니다.
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <Link
                href={`/players/${id1}`}
                className="flex-1 text-center text-xs px-3 py-2.5 border border-turf-line/60 text-floodlight/60 hover:border-score-amber hover:text-score-amber rounded-full transition-colors"
              >
                {name1} 상세
              </Link>
              <Link
                href={`/players/${id2}`}
                className="flex-1 text-center text-xs px-3 py-2.5 border border-turf-line/60 text-floodlight/60 hover:border-score-amber hover:text-score-amber rounded-full transition-colors"
              >
                {name2} 상세
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
