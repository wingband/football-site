"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

// 모바일 하단 고정 탭 (2026-10-11 메인 개편). 데스크톱에선 숨김.
const TABS = [
  { href: "/korean-players", label: "해외파", icon: "🇰🇷" },
  { href: "/matches", label: "경기", icon: "⚽" },
  { href: "/schedule", label: "일정", icon: "📅" },
  { href: "/columns", label: "칼럼", icon: "📝" },
  { href: "/board", label: "게시판", icon: "💬" },
]

export default function MobileTabBar() {
  const pathname = usePathname() ?? "/"
  return (
    <nav
      aria-label="하단 메뉴"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-pitch-night/95 backdrop-blur border-t border-turf-line/60 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href)
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs ${active ? "text-score-amber" : "text-floodlight/60"}`}
              >
                <span className="text-base leading-none">{t.icon}</span>
                {t.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
