"use client"

import Link, { useLinkStatus } from "next/link"
import { usePathname } from "next/navigation"

// 모바일 하단 고정 탭 (2026-10-11 메인 개편). 데스크톱에선 숨김.
const TABS = [
  { href: "/korean-players", label: "해외파", icon: "🇰🇷" },
  { href: "/matches", label: "경기", icon: "⚽" },
  { href: "/schedule", label: "일정", icon: "📅" },
  { href: "/columns", label: "칼럼", icon: "📝" },
  { href: "/board", label: "게시판", icon: "💬" },
]

// 누르는 즉시 색이 바뀌어서 "눌렸다"는 반응이 바로 보이게 한다
function TabLabel({ icon, label }: { icon: string; label: string }) {
  const { pending } = useLinkStatus()
  return (
    <span className={`flex flex-col items-center gap-0.5 ${pending ? "text-score-amber animate-pulse" : ""}`}>
      <span className="text-base leading-none">{icon}</span>
      {label}
    </span>
  )
}

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
                className={`block py-2 text-center text-sm ${active ? "text-score-amber" : "text-floodlight/70"}`}
              >
                <TabLabel icon={t.icon} label={t.label} />
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
