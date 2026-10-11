"use client"

import { usePathname } from "next/navigation"
import CoupangBanner from "@/components/CoupangBanner"

// 쿠팡 파트너스 배너를 모든 콘텐츠 페이지의 본문 맨 아래(푸터 바로 위)에 한 번만 보여준다 (2026-10-12 기준 통일).
// 메인은 오른쪽 게시판 아래에 이미 있어서 제외, 글쓰기·로그인·정책 페이지 등은 제외.
const EXCLUDE = [
  "/board/write",
  "/columns/write",
  "/columns/names",
  "/sign-in",
  "/sign-up",
  "/company",
  "/privacy",
  "/advertise",
  "/search",
]

export default function PageCoupang() {
  const pathname = usePathname() ?? "/"
  if (pathname === "/") return null
  if (EXCLUDE.some((p) => pathname.startsWith(p))) return null
  if (/^\/board\/[^/]+\/edit/.test(pathname)) return null
  return (
    <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 pb-8">
      <div className="bg-turf/40 border border-turf-line/60 rounded-none p-3">
        <CoupangBanner />
      </div>
    </div>
  )
}
