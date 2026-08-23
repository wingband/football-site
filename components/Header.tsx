"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { UserButton, SignInButton, SignUpButton, useUser } from "@clerk/nextjs"

const NAV_LINKS = [
  { href: "/matches", label: "경기" },
  { href: "/stories", label: "리뷰" },
  { href: "/standings", label: "순위표" },
  { href: "/korean-players", label: "🇰🇷 해외파" },
  { href: "/compare", label: "비교" },
  { href: "/news", label: "뉴스" },
  { href: "/best11", label: "베스트11" },
  { href: "/transfers", label: "이적" },
]

export default function Header() {
  const [query, setQuery] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const { isSignedIn } = useUser()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed.length === 0) return
    setMenuOpen(false)
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <header className="sticky top-0 z-50 bg-pitch-night/95 backdrop-blur border-b border-turf-line/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-8">
        <Link href="/matches" className="font-display uppercase tracking-wide text-lg text-score-amber shrink-0 hover:text-floodlight transition-colors cursor-pointer">
          GoalLine
        </Link>

        {/* 데스크톱 메뉴 */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-floodlight/70 shrink-0">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-floodlight transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>

        {/* 데스크톱 검색창 */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xs hidden md:block">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="팀, 선수, 리그 검색"
            className="w-full bg-turf/60 border border-turf-line rounded-full px-4 py-1.5 text-sm text-floodlight placeholder:text-floodlight/30 focus:outline-none focus:border-score-amber transition-colors"
          />
        </form>

        {/* 로그인·회원가입 / 유저 버튼 */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {isSignedIn ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                  userButtonPopoverCard: "bg-pitch-night border border-turf-line",
                  userButtonPopoverActionButton: "text-floodlight/70 hover:text-floodlight",
                },
              }}
            />
          ) : (
            <>
              <SignInButton mode="modal">
                <button className="text-xs px-3 py-1.5 border border-turf-line/60 text-floodlight/60 hover:border-score-amber hover:text-score-amber rounded-full transition-colors">
                  로그인
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="text-xs px-3 py-1.5 bg-score-amber text-pitch-night font-semibold hover:bg-floodlight rounded-full transition-colors">
                  회원가입
                </button>
              </SignUpButton>
            </>
          )}
        </div>

        {/* 모바일: 햄버거 */}
        <div className="flex md:hidden items-center gap-2 ml-auto">
          {isSignedIn ? (
            <UserButton appearance={{ elements: { avatarBox: "w-7 h-7" } }} />
          ) : (
            <>
              <SignInButton mode="modal">
                <button className="text-xs px-2.5 py-1 border border-turf-line/60 text-floodlight/60 rounded-full">
                  로그인
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="text-xs px-2.5 py-1 bg-score-amber text-pitch-night font-semibold rounded-full">
                  회원가입
                </button>
              </SignUpButton>
            </>
          )}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="메뉴 열기"
            className="p-2 text-floodlight/70 hover:text-floodlight"
          >
            {menuOpen ? (
              <span className="text-xl leading-none">✕</span>
            ) : (
              <span className="flex flex-col gap-1">
                <span className="block w-5 h-0.5 bg-current" />
                <span className="block w-5 h-0.5 bg-current" />
                <span className="block w-5 h-0.5 bg-current" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 모바일 드롭다운 */}
      {menuOpen && (
        <div className="md:hidden border-t border-turf-line/60 bg-pitch-night px-4 py-4 space-y-4">
          <form onSubmit={handleSearch}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="팀, 선수, 리그 검색"
              className="w-full bg-turf/60 border border-turf-line rounded-full px-4 py-2 text-sm text-floodlight placeholder:text-floodlight/30 focus:outline-none focus:border-score-amber transition-colors"
            />
          </form>
          <nav className="flex flex-col gap-1 text-sm">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="py-2.5 px-2 rounded text-floodlight/80 hover:bg-turf-line/40 hover:text-floodlight transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
