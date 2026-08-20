"use client"

import { useState, type ReactNode } from "react"

const TABS = ["팩트", "티커", "라인업", "순위", "통계", "역대전적"] as const
type TabName = (typeof TABS)[number]

type MatchTabsProps = {
  facts: ReactNode
  ticker: ReactNode
  lineup: ReactNode
  standings: ReactNode
  stats: ReactNode
  h2h: ReactNode
}

export default function MatchTabs({ facts, ticker, lineup, standings, stats, h2h }: MatchTabsProps) {
  const [active, setActive] = useState<TabName>("팩트")

  const content: Record<TabName, ReactNode> = {
    팩트: facts,
    티커: ticker,
    라인업: lineup,
    순위: standings,
    통계: stats,
    역대전적: h2h,
  }

  return (
    <div>
      <div className="flex overflow-x-auto border-b border-turf-line/60 px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
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
