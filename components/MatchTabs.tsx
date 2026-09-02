"use client"

import { useState, type ReactNode } from "react"
import Section from "@/components/Section"
import H2HPanel from "@/components/H2HPanel"
import StandingsTable from "@/components/StandingsTable"

const TABS = ["팩트", "티커", "라인업", "순위", "통계", "역대전적"] as const
type TabName = (typeof TABS)[number]

type MatchTabsProps = {
  facts: ReactNode
  ticker: ReactNode
  lineup: ReactNode
  stats: ReactNode
  // 순위/역대전적은 페이지 로드 시 미리 서버에서 fetch하지 않고, 탭을 실제로
  // 클릭했을 때만 브라우저에서 불러온다 (대부분의 방문자가 안 누르는 탭이라
  // API 호출을 아끼기 위함). 그래서 ReactNode가 아니라 필요한 파라미터만 받는다
  leagueId: number
  season: number
  homeTeamId: number
  awayTeamId: number
  currentFixtureId: number
  homeTeamName: string
  awayTeamName: string
  homeTeamLogo: string
  awayTeamLogo: string
}

export default function MatchTabs({
  facts,
  ticker,
  lineup,
  stats,
  leagueId,
  season,
  homeTeamId,
  awayTeamId,
  currentFixtureId,
  homeTeamName,
  awayTeamName,
  homeTeamLogo,
  awayTeamLogo,
}: MatchTabsProps) {
  const [active, setActive] = useState<TabName>("팩트")

  // 각 탭은 처음 열릴 때 한 번만 fetch하고 이후엔 캐시된 상태를 재사용
  const [standings, setStandings] = useState<unknown[] | null>(null)
  const [standingsLoading, setStandingsLoading] = useState(false)
  const [h2h, setH2h] = useState<unknown[] | null>(null)
  const [h2hLoading, setH2hLoading] = useState(false)

  async function handleTabClick(tab: TabName) {
    setActive(tab)
    if (tab === "순위" && standings === null && !standingsLoading) {
      setStandingsLoading(true)
      try {
        const res = await fetch(`/api/match-standings?leagueId=${leagueId}&season=${season}`)
        const data = await res.json()
        setStandings(data.standings ?? [])
      } finally {
        setStandingsLoading(false)
      }
    }
    if (tab === "역대전적" && h2h === null && !h2hLoading) {
      setH2hLoading(true)
      try {
        const res = await fetch(`/api/match-h2h?homeId=${homeTeamId}&awayId=${awayTeamId}`)
        const data = await res.json()
        setH2h(data.h2h ?? [])
      } finally {
        setH2hLoading(false)
      }
    }
  }

  const standingsContent = standingsLoading ? (
    <p className="text-floodlight/40 text-sm py-6 text-center">불러오는 중...</p>
  ) : standings && standings.length > 0 ? (
    <Section title="순위">
      <StandingsTable
        standings={standings as never}
        highlightTeamIds={[homeTeamId, awayTeamId]}
      />
    </Section>
  ) : standings ? (
    <p className="text-floodlight/40 text-sm py-6 text-center">순위 정보가 없습니다.</p>
  ) : null

  const h2hContent = h2hLoading ? (
    <p className="text-floodlight/40 text-sm py-6 text-center">불러오는 중...</p>
  ) : h2h && h2h.length > 0 ? (
    <Section title="역대 전적">
      <H2HPanel
        matches={h2h as never}
        currentFixtureId={currentFixtureId}
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        homeTeamLogo={homeTeamLogo}
        awayTeamLogo={awayTeamLogo}
      />
    </Section>
  ) : h2h ? (
    <p className="text-floodlight/40 text-sm py-6 text-center">상대전적 정보가 없습니다.</p>
  ) : null

  const content: Record<TabName, ReactNode> = {
    팩트: facts,
    티커: ticker,
    라인업: lineup,
    순위: standingsContent,
    통계: stats,
    역대전적: h2hContent,
  }

  return (
    <div>
      <div className="flex overflow-x-auto border-b border-turf-line/60 px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`shrink-0 px-4 py-3 text-sm font-medium transition-colors relative ${
              active === tab ? "text-score-amber" : "text-floodlight/40 hover:text-floodlight/70"
            }`}
          >
            {tab}
            {active === tab && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-score-amber" />
            )}
          </button>
        ))}
      </div>
      <div className="px-4">{content[active]}</div>
    </div>
  )
}
