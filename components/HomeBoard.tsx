"use client"

import Link from "next/link"
import { useState } from "react"

// 메인 게시판 (2026-10-12): 탭을 누르면 페이지 이동 없이 그 게시판의 글이 바로 바뀐다.
export type HomeBoardPost = { id: number; label: string; title: string; commentCount: number; md: string }
export type HomeBoardTab = { key: string; label: string; posts: HomeBoardPost[] }

export default function HomeBoard({ tabs }: { tabs: HomeBoardTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? "all")
  const cur = tabs.find((t) => t.key === active) ?? tabs[0]
  const href = cur.key === "all" ? "/board" : `/board?category=${cur.key}`

  return (
    <>
      <div className="flex flex-wrap gap-1.5 mb-3" role="tablist" aria-label="게시판 선택">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            onClick={() => setActive(t.key)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              active === t.key
                ? "border-score-amber bg-score-amber/15 text-score-amber font-semibold"
                : "border-turf-line text-floodlight/80 hover:text-floodlight hover:border-floodlight/40"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* 글이 4개보다 적어도(빈 게시판 포함) 아래 배너 위치가 움직이지 않도록 목록 높이(4줄)를 고정 */}
      <div className="min-h-[9.5rem]">
      {cur.posts.length === 0 ? (
        <p className="text-sm text-floodlight/65 py-3">아직 글이 없어요. 첫 글을 남겨보세요!</p>
      ) : (
        <ul className="divide-y divide-turf-line/40">
          {cur.posts.map((p) => (
            <li key={p.id}>
              <Link href={`/board/${p.id}`} className="flex items-center gap-2 py-2 text-sm hover:text-score-amber">
                <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-turf-line/60 text-floodlight/80">{p.label}</span>
                <span className="truncate text-floodlight/90">{p.title}</span>
                {p.commentCount > 0 && <span className="shrink-0 text-xs text-score-amber font-data">[{p.commentCount}]</span>}
                <span className="ml-auto shrink-0 text-xs text-floodlight/55 font-data">{p.md}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      </div>
      <Link href={href} className="mt-1 block text-center text-xs text-floodlight/65 hover:text-score-amber py-2">
        {cur.key === "all" ? "게시판 전체 보기" : `${cur.label} 게시판 더 보기`} →
      </Link>
    </>
  )
}
