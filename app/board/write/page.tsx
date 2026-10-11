"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useUser, SignInButton } from "@clerk/nextjs"
import { applyFormat, FORMAT_BUTTONS, TITLE_MAX, CONTENT_MAX } from "@/lib/boardEditor"
import { BOARD_CATEGORIES, boardCategory, isBoardCategory } from "@/lib/boardCategories"

export default function BoardWritePage() {
  const { isSignedIn, isLoaded, user } = useUser()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [preview, setPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // 게시판 탭에서 글쓰기를 누르면 ?category=epl 처럼 넘어온다 — 그 게시판을 기본 선택.
  // (이 페이지는 Clerk 로딩 전까지 아무것도 그리지 않아서 서버/클라이언트 초기값 차이로 인한 hydration 문제는 없다)
  const [category, setCategory] = useState<string>(() => {
    if (typeof window === "undefined") return "free"
    const c = new URLSearchParams(window.location.search).get("category")
    return isBoardCategory(c) ? c : "free"
  })

  function handleFormat(action: Parameters<typeof applyFormat>[1]) {
    const el = textareaRef.current
    if (!el) return
    const result = applyFormat(el, action)
    setContent(result.value)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(result.selectionStart, result.selectionEnd)
    })
  }

  async function submit() {
    if (!title.trim() || !content.trim()) {
      setError("제목과 내용을 모두 입력해주세요")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const nickname =
        user?.username ?? user?.firstName ?? user?.emailAddresses[0]?.emailAddress?.split("@")[0] ?? "익명"
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, nickname, category }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "글 등록에 실패했습니다")
        return
      }
      router.push(`/board/${data.id}`)
    } catch {
      setError("글 등록에 실패했습니다")
    } finally {
      setSubmitting(false)
    }
  }

  if (!isLoaded) return null

  if (!isSignedIn) {
    return (
      <main className="min-h-[60vh] text-floodlight flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-floodlight/50 mb-4">글을 쓰려면 로그인이 필요합니다</p>
          <SignInButton mode="modal">
            <button className="text-sm px-6 py-2.5 bg-score-amber text-pitch-night font-bold rounded hover:bg-score-amber/80 transition-colors">
              로그인하기
            </button>
          </SignInButton>
        </div>
      </main>
    )
  }

  const cat = boardCategory(category)
  const draftKey = "goalline-board-draft"
  function saveDraft() {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ title, content, category }))
      setNotice("임시 저장했어요 (이 브라우저에만 저장돼요)")
    } catch {
      setNotice("임시 저장에 실패했어요")
    }
  }
  function loadDraft() {
    try {
      const d = JSON.parse(localStorage.getItem(draftKey) ?? "null")
      if (!d) return setNotice("임시 저장된 글이 없어요")
      setTitle(String(d.title ?? "").slice(0, TITLE_MAX))
      setContent(String(d.content ?? "").slice(0, CONTENT_MAX))
      if (isBoardCategory(d.category)) setCategory(d.category)
      setNotice("임시 저장한 글을 불러왔어요")
    } catch {
      setNotice("불러오지 못했어요")
    }
  }

  const btn = "text-sm px-5 py-2.5 rounded-lg border border-turf-line text-floodlight/85 hover:bg-turf-line/30 transition-colors"
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 text-floodlight">
      <h1 className="text-xl font-display text-floodlight mb-3 flex items-center gap-2">
        <span className="w-2 h-6 rounded-sm bg-score-amber" />
        {cat ? cat.title : "게시판"} 글쓰기
      </h1>

      <div className="bg-turf/40 border border-turf-line/60 rounded-2xl p-4 sm:p-5 space-y-3">
        {/* 게시판 선택 + 제목 */}
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="게시판 선택"
            className="sm:w-56 bg-pitch-night border border-turf-line rounded-lg px-3 py-2.5 text-sm text-floodlight focus:outline-none focus:border-score-amber"
          >
            {BOARD_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
            placeholder="제목"
            className="flex-1 min-w-0 bg-pitch-night border border-turf-line rounded-lg px-3 py-2.5 text-sm text-floodlight placeholder:text-floodlight/50 focus:outline-none focus:border-score-amber"
          />
        </div>

        {/* 에디터 */}
        <div className="border border-turf-line rounded-lg overflow-hidden bg-pitch-night">
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-turf-line/60 bg-turf/50">
            {FORMAT_BUTTONS.map((b) => (
              <button
                key={b.action}
                type="button"
                title={b.title}
                onClick={() => handleFormat(b.action)}
                className="w-8 h-8 flex items-center justify-center text-sm text-floodlight/80 rounded hover:bg-turf-line/50 hover:text-floodlight transition-colors"
              >
                {b.label}
              </button>
            ))}
            <span className="ml-auto hidden sm:block text-xs text-floodlight/60 pr-1">**굵게** *기울임* &gt;인용 지원</span>
          </div>
          {preview ? (
            <div className="min-h-[420px] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-floodlight">
              {content || <span className="text-floodlight/50">미리 볼 내용이 없어요</span>}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, CONTENT_MAX))}
              placeholder={"내용을 입력하세요\n\n※ 경고 없이 삭제될 수 있어요\n· 욕설·비방·도배 금지\n· 분쟁을 일으키는 글·댓글 금지"}
              className="w-full min-h-[420px] bg-transparent px-4 py-3 text-sm text-floodlight placeholder:text-floodlight/50 focus:outline-none resize-y leading-relaxed block"
            />
          )}
          <div className="flex items-center justify-end gap-3 px-4 py-2 border-t border-turf-line/60 text-xs text-floodlight/60">
            <span>제목 {title.length}/{TITLE_MAX}</span>
            <span>본문 {content.length}/{CONTENT_MAX}</span>
          </div>
        </div>

        <div className="rounded-lg border border-turf-line/60 bg-pitch-night/60 px-4 py-3 text-sm text-floodlight/75 leading-relaxed">
          <p>· 서로 매너를 지켜주세요. 욕설·도배·분쟁 유발 글은 예고 없이 삭제되고 이용이 제한될 수 있어요.</p>
          <p>· 경기 이야기는 해당 리그 게시판에, 해외파 선수 이야기는 해외파 게시판에 써주세요.</p>
        </div>

        {(error || notice) && <p className={`text-sm ${error ? "text-red-400" : "text-score-amber"}`}>{error || notice}</p>}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link href={category === "free" ? "/board" : `/board?category=${category}`} className={btn}>
            돌아가기
          </Link>
          <button type="button" onClick={saveDraft} className={btn}>
            임시 저장
          </button>
          <button type="button" onClick={loadDraft} className={btn}>
            불러오기
          </button>
          <button type="button" onClick={() => setPreview((v) => !v)} className={btn}>
            {preview ? "편집으로" : "미리 보기"}
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="ml-auto text-sm px-8 py-2.5 rounded-lg bg-score-amber text-pitch-night font-bold hover:bg-floodlight transition-colors disabled:opacity-50"
          >
            {submitting ? "등록 중..." : "등록"}
          </button>
        </div>
      </div>
    </main>
  )
}
