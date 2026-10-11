"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { applyFormat, FORMAT_BUTTONS } from "@/lib/boardEditor"
import ColumnBody from "@/components/ColumnBody"
import OpinionQuickPublish from "./OpinionQuickPublish"
import RegenerateDraftButton from "./RegenerateDraftButton"
import { uploadColumnImage } from "./uploadColumnImage"

// lib/columns.ts는 서버 전용(DB)이라 클라이언트에서 import하지 않고 한도만 복제
const TITLE_MAX = 120
const SUMMARY_MAX = 200
const CONTENT_MAX = 30000
// lib/generateWeeklyColumn.ts의 OPINION_PLACEHOLDER와 같은 문자열 (서버 코드라 import 불가)
const OPINION_PLACEHOLDER = "(여기에 직접 한두 줄 의견을 써주세요)"

type Initial = {
  slug: string
  title: string
  summary: string
  content: string
  tags: string
  published: boolean
} | null

const GUIDE = `## 소제목은 이렇게
문단은 빈 줄로 나눕니다. **굵게**, *기울임*, [링크](https://goalline.me) 를 쓸 수 있어요.

- 목록은 하이픈으로
- 이렇게

> 인용은 꺾쇠로`

export default function ColumnEditor({ initial }: { initial: Initial }) {
  const router = useRouter()
  const [title, setTitle] = useState(initial?.title ?? "")
  const [summary, setSummary] = useState(initial?.summary ?? "")
  const [tags, setTags] = useState(initial?.tags ?? "")
  const [content, setContent] = useState(initial?.content ?? "")
  const [published, setPublished] = useState(initial?.published ?? true)
  const [tab, setTab] = useState<"write" | "preview">("write")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const isWeeklyDraft = Boolean(initial?.slug.includes("weekly-korean-abroad") && !initial?.published)

  async function handleImage(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError("")
    try {
      const url = await uploadColumnImage(file)
      const el = textareaRef.current
      const pos = el ? el.selectionStart : content.length
      const snippet = `\n![사진 설명을 여기에 써주세요](${url})\n`
      setContent((prev) => (prev.slice(0, pos) + snippet + prev.slice(pos)).slice(0, CONTENT_MAX))
      setTab("write")
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했습니다")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }
  // AI 초안(의견 자리가 남아 있는 글)은 기본으로 "의견만 달고 발행" 간단 화면을 보여준다
  const [quick, setQuick] = useState(() => Boolean(initial?.content.includes(OPINION_PLACEHOLDER)))

  function insertAtLineStart(prefix: string) {
    const el = textareaRef.current
    if (!el) return
    const { value, selectionStart } = el
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart)
    setContent(next.slice(0, CONTENT_MAX))
    requestAnimationFrame(() => {
      el.focus()
      const pos = selectionStart + prefix.length
      el.setSelectionRange(pos, pos)
    })
  }

  function handleFormat(action: Parameters<typeof applyFormat>[1]) {
    const el = textareaRef.current
    if (!el) return
    const result = applyFormat(el, action)
    setContent(result.value.slice(0, CONTENT_MAX))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(result.selectionStart, result.selectionEnd)
    })
  }

  async function submit() {
    if (!title.trim() || content.trim().length < 50) {
      setError("제목과 본문(50자 이상)을 입력해주세요")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: initial?.slug,
          title,
          summary,
          content,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          published,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "저장에 실패했습니다")
        return
      }
      router.push(`/columns/${data.slug}`)
      router.refresh()
    } catch {
      setError("저장에 실패했습니다")
    } finally {
      setSubmitting(false)
    }
  }

  async function remove() {
    if (!initial?.slug) return
    if (!confirm("이 칼럼을 삭제할까요? 되돌릴 수 없습니다.")) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/columns/${initial.slug}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "삭제에 실패했습니다")
        return
      }
      router.push("/columns")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  if (quick && initial) {
    return (
      <OpinionQuickPublish
        slug={initial.slug}
        title={initial.title}
        summary={initial.summary}
        content={initial.content}
        tags={initial.tags.split(",").map((t) => t.trim()).filter(Boolean)}
        placeholder={OPINION_PLACEHOLDER}
        onEditFull={() => setQuick(false)}
      />
    )
  }

  const inputCls =
    "w-full bg-transparent px-4 py-3 text-sm text-floodlight placeholder:text-floodlight/30 focus:outline-none"

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-1.5 text-[11px] text-floodlight/40 mb-3">
          <Link href="/columns" className="hover:text-floodlight/70 transition-colors">칼럼</Link>
          <span>/</span>
          <span>{initial ? "수정" : "새 칼럼"}</span>
        </div>
        <h1 className="font-display uppercase text-xl text-score-amber mb-6">{initial ? "칼럼 수정" : "새 칼럼 쓰기"}</h1>

        <div className="border border-turf-line rounded-lg overflow-hidden bg-turf/20">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
            placeholder="제목 (예: 이번 주 한국인 해외파 활약 정리)"
            className={`${inputCls} text-base font-semibold border-b border-turf-line/60`}
          />
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value.slice(0, SUMMARY_MAX))}
            placeholder="한 줄 요약 (목록과 검색 결과에 보여요)"
            className={`${inputCls} border-b border-turf-line/60`}
          />
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="태그 (쉼표로 구분, 예: 해외파, 손흥민, 토트넘)"
            className={`${inputCls} border-b border-turf-line/60`}
          />

          <div className="flex items-center gap-1 px-3 py-2 border-b border-turf-line/60 bg-pitch-night/40">
            <button
              type="button"
              onClick={() => setTab("write")}
              className={`text-xs px-2.5 py-1 rounded ${tab === "write" ? "bg-turf-line/50 text-floodlight" : "text-floodlight/50"}`}
            >
              쓰기
            </button>
            <button
              type="button"
              onClick={() => setTab("preview")}
              className={`text-xs px-2.5 py-1 rounded mr-2 ${tab === "preview" ? "bg-turf-line/50 text-floodlight" : "text-floodlight/50"}`}
            >
              미리보기
            </button>
            {tab === "write" && (
              <>
                <button
                  type="button"
                  title="소제목"
                  onClick={() => insertAtLineStart("## ")}
                  className="h-7 px-2 flex items-center justify-center text-xs text-floodlight/60 rounded hover:bg-turf-line/40 hover:text-floodlight transition-colors"
                >
                  H
                </button>
                <button
                  type="button"
                  title="목록"
                  onClick={() => insertAtLineStart("- ")}
                  className="h-7 px-2 flex items-center justify-center text-xs text-floodlight/60 rounded hover:bg-turf-line/40 hover:text-floodlight transition-colors"
                >
                  •
                </button>
                <button
                  type="button"
                  title="사진 넣기"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="h-7 px-2 flex items-center justify-center text-xs text-floodlight/60 rounded hover:bg-turf-line/40 hover:text-floodlight transition-colors disabled:opacity-50"
                >
                  {uploading ? "올리는 중…" : "🖼 사진"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => handleImage(e.target.files?.[0])}
                />
                {FORMAT_BUTTONS.map((btn) => (
                  <button
                    key={btn.action}
                    type="button"
                    title={btn.title}
                    onClick={() => handleFormat(btn.action)}
                    className="w-7 h-7 flex items-center justify-center text-xs text-floodlight/60 rounded hover:bg-turf-line/40 hover:text-floodlight transition-colors"
                  >
                    {btn.label}
                  </button>
                ))}
              </>
            )}
          </div>

          {tab === "write" ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, CONTENT_MAX))}
              placeholder={GUIDE}
              rows={22}
              className={`${inputCls} resize-y leading-relaxed min-h-[400px]`}
            />
          ) : (
            <div className="px-5 py-6 min-h-[400px]">
              {content.trim() ? <ColumnBody content={content} /> : <p className="text-sm text-floodlight/30">본문이 비어 있습니다.</p>}
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-2 border-t border-turf-line/60 text-[11px] text-floodlight/40">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              공개
            </label>
            <span>{content.length.toLocaleString()}자</span>
          </div>
        </div>

        {content.includes(OPINION_PLACEHOLDER) && (
          <p className="text-xs text-score-amber mt-2 leading-relaxed">
            ✍️ AI가 만든 초안이에요. 본문의 「{OPINION_PLACEHOLDER}」 자리를 내 생각으로 바꿔야 공개할 수 있어요.
            틀린 내용이 없는지도 한 번 확인해 주세요.
          </p>
        )}
        <p className="text-[11px] text-floodlight/35 mt-2">
          사진은 직접 찍거나 만든 것, 또는 사용 허락을 받은 것만 올려주세요. 뉴스 사진·선수 사진을 퍼오면 저작권 문제가 생길 수 있어요.
        </p>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-start gap-4">
            {initial && (
              <button
                onClick={remove}
                disabled={submitting}
                className="text-xs text-red-400/80 hover:text-red-400 disabled:opacity-50"
              >
                삭제
              </button>
            )}
            {isWeeklyDraft && <RegenerateDraftButton />}
          </div>
          <div className="flex gap-2">
            <Link
              href={initial ? `/columns/${initial.slug}` : "/columns"}
              className="text-sm px-6 py-2.5 border border-turf-line text-floodlight/60 rounded hover:bg-turf-line/20 transition-colors"
            >
              취소
            </Link>
            <button
              onClick={submit}
              disabled={submitting}
              className="text-sm px-6 py-2.5 bg-score-amber text-pitch-night font-bold rounded hover:bg-score-amber/80 transition-colors disabled:opacity-50"
            >
              {submitting ? "저장 중..." : initial ? "수정 저장" : "발행"}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
