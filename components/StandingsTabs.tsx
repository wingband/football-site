"use client"

import { useState, type ReactNode } from "react"
import Logo from "@/components/Logo"

// 순위표 페이지: 리그 7개를 줄줄이 나열하지 않고 탭으로 하나씩 보여준다.
// 모든 리그의 표는 HTML에 그대로 있고(검색엔진용) 선택되지 않은 것만 숨긴다.
type Item = { id: number; name: string; logo: string; node: ReactNode }

export default function StandingsTabs({ items }: { items: Item[] }) {
  const [active, setActive] = useState(items[0]?.id)

  return (
    <div className="space-y-4">
      <nav className="flex gap-1 border-b border-turf-line/40 " aria-label="리그 선택">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => setActive(it.id)}
            aria-pressed={active === it.id}
            title={it.name}
            aria-label={it.name}
            className={`flex-1 sm:flex-none min-w-0 flex items-center justify-center gap-1.5 px-1 sm:px-3.5 py-2.5 text-sm -mb-px border-b-2 transition-colors ${
              active === it.id
                ? "border-score-amber text-score-amber font-bold"
                : "border-transparent text-floodlight/70 hover:text-floodlight"
            }`}
          >
            <Logo src={it.logo} alt="" className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">{it.name}</span>
          </button>
        ))}
      </nav>
      {items.map((it) => (
        <div key={it.id} hidden={active !== it.id}>
          {it.node}
        </div>
      ))}
    </div>
  )
}
