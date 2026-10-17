"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ColumnBody from "@/components/ColumnBody"
import RegenerateDraftButton from "./RegenerateDraftButton"
import { draftKindOf } from "@/lib/draftKinds"
import { uploadColumnImage } from "./uploadColumnImage"

// AI 초안에 운영자 의견만 채워서 바로 발행하는 간단한 화면 (2026-10-10).
// 본문을 직접 고칠 필요 없이, 의견 자리마다 입력 칸 하나씩만 보여준다.
// 휴대폰에서도 1~2분이면 끝낼 수 있게 하는 게 목표.

type Props = {
  slug: string
  title: string
  summary: string
  content: string
  tags: string[]
  placeholder: string
  onEditFull: () => void
}

type Slot = { label: string }

// 각 의견 자리 바로 위의 소제목을 찾아 입력 칸 이름으로 쓴다
function findSlots(content: string, placeholder: string): Slot[] {
  const slots: Slot[] = []
  let heading = "의견"
  for (const line of content.split("\n")) {
    const h = line.match(/^#{2,3}\s+(.*)/)
    if (h) heading = h[1].trim()
    if (line.includes(placeholder)) slots.push({ label: heading })
  }
  return slots
}

function fill(content: string, placeholder: string, opinions: string[], fallback: (i: number) => string): string {
  let i = 0
  return content.split(placeholder).reduce((acc, part, idx) => {
    if (idx === 0) return part
    const value = opinions[i]?.trim() || fallback(i)
    i++
    return acc + value + part
  }, "")
}

export default function OpinionQuickPublish({ slug, title, summary, content, tags, placeholder, onEditFull }: Props) {
  const kind = draftKindOf(slug)
  const regenKind = kind && kind !== "report" ? kind : null
  const router = useRouter()
  // 의견 칸은 맨 끝(한 줄 총평) 하나만 받는다. 예전 초안에 남은 다른 의견 자리 줄은 지운다
  const body = useMemo(() => {
    const lines = content.split("\n")
    const idxs = lines.map((l, i) => (l.includes(placeholder) ? i : -1)).filter((i) => i >= 0)
    const keep = idxs[idxs.length - 1]
    return lines.filter((l, i) => !l.includes(placeholder) || i === keep).join("\n").replace(/\n{3,}/g, "\n\n")
  }, [content, placeholder])
  const slots = useMemo(() => findSlots(body, placeholder), [body, placeholder])
  const [opinions, setOpinions] = useState<string[]>(() => slots.map(() => ""))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  // 선택: 글 맨 위에 넣을 사진 한 장
  const [photo, setPhoto] = useState<{ url: string; caption: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handlePhoto(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError("")
    try {
      setPhoto({ url: await uploadColumnImage(file), caption: "" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했습니다")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const withPhoto = (body: string) =>
    photo ? `![${photo.caption.replace(/[\[\]]/g, "").trim()}](${photo.url})\n\n${body}` : body
  const preview = withPhoto(fill(body, placeholder, opinions, () => "…"))
  const allFilled = opinions.every((o) => o.trim().length >= 5)

  async function publish() {
    if (!allFilled) {
      setError("의견 칸을 모두 한 줄씩(5자 이상) 채워주세요")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title,
          summary,
          content: withPhoto(fill(body, placeholder, opinions, () => "")),
          tags,
          published: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "발행에 실패했습니다")
        return
      }
      router.push(`/columns/${data.slug}`)
      router.refresh()
    } catch {
      setError("발행에 실패했습니다")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-1.5 text-xs text-floodlight/40 mb-3">
          <Link href="/columns" className="hover:text-floodlight/70 transition-colors">칼럼</Link>
          <span>/</span>
          <span>의견 달고 발행</span>
        </div>

        <div className="border border-score-amber/40 bg-score-amber/5 p-4 mb-6">
          <p className="text-sm font-semibold text-score-amber">✍️ 이번 주 자동 초안이 준비됐어요</p>
          <p className="text-xs text-floodlight/60 mt-1 leading-relaxed">
            아래 칸에 이번 주 총평을 한두 줄 적고 발행을 누르면 끝이에요. 태그는 발행할 때 자동으로 붙어요. 반말·짧은 말투도 괜찮아요.
            발행 전에 아래 미리보기에서 틀린 내용이 없는지 한 번만 훑어봐 주세요.
          </p>
        </div>

        <div className="space-y-4">
          {slots.map((slot, i) => (
            <label key={i} className="block">
              <span className="text-xs text-floodlight/60">{slot.label === "한 줄 총평" ? "이번 주 한 줄 총평" : `${slot.label}에 대한 내 한마디`}</span>
              <textarea
                value={opinions[i]}
                onChange={(e) => setOpinions((prev) => prev.map((v, j) => (j === i ? e.target.value.slice(0, 300) : v)))}
                rows={2}
                placeholder="예) 대표팀에 못 간 선수들이 소속팀에서 더 빛난 한 주였다"
                className="mt-1 w-full bg-turf/30 border border-turf-line px-3 py-2 text-sm text-floodlight placeholder:text-floodlight/30 focus:outline-none focus:border-score-amber/60 resize-none"
              />
            </label>
          ))}
        </div>

        <div className="mt-5 border border-dashed border-turf-line/60 p-3">
          {photo ? (
            <div className="flex gap-3 items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="w-24 h-16 object-cover rounded shrink-0" />
              <div className="flex-1 min-w-0">
                <input
                  value={photo.caption}
                  onChange={(e) => setPhoto({ ...photo, caption: e.target.value.slice(0, 80) })}
                  placeholder="사진 설명 (선택)"
                  className="w-full bg-transparent border-b border-turf-line px-1 py-1 text-sm focus:outline-none focus:border-score-amber/60"
                />
                <button onClick={() => setPhoto(null)} className="text-xs text-floodlight/50 mt-2 hover:text-floodlight">
                  사진 빼기
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-sm text-floodlight/60 hover:text-floodlight disabled:opacity-50"
            >
              {uploading ? "사진 올리는 중…" : "🖼 사진 한 장 추가 (선택)"}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => handlePhoto(e.target.files?.[0])}
          />
          <p className="text-xs text-floodlight/35 mt-2">직접 찍거나 만든 사진만 올려주세요. 뉴스·선수 사진을 퍼오면 저작권 문제가 생길 수 있어요.</p>
        </div>

        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

        <div className="flex items-center justify-between gap-3 mt-5">
          <div className="flex items-start gap-4">
            <button onClick={onEditFull} className="text-xs text-floodlight/50 underline underline-offset-2 hover:text-floodlight">
              본문 직접 고치기
            </button>
            {regenKind && <RegenerateDraftButton kind={regenKind} />}
          </div>
          <button
            onClick={publish}
            disabled={submitting || !allFilled}
            className="text-sm px-6 py-2.5 bg-score-amber text-pitch-night font-bold rounded hover:bg-score-amber/80 transition-colors disabled:opacity-40"
          >
            {submitting ? "발행 중..." : "의견 넣고 발행"}
          </button>
        </div>

        <div className="mt-10 pt-6 border-t border-turf-line/40">
          <p className="text-xs text-floodlight/40 mb-3">미리보기</p>
          <h1 className="text-xl font-bold leading-snug">{title}</h1>
          {summary && <p className="text-sm text-floodlight/60 mt-2">{summary}</p>}
          <div className="mt-6">
            <ColumnBody content={preview} />
          </div>
        </div>
      </div>
    </main>
  )
}
