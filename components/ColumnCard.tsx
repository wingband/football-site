import Link from "next/link"
import Logo from "@/components/Logo"
import PlayerAvatar from "@/components/PlayerAvatar"
import { columnCardInfo } from "@/lib/columnCard"
import { draftKindOf } from "@/lib/draftKinds"
import type { Column } from "@/lib/columns"

// 칼럼 카드 (메인·칼럼 목록 공용, 2026-10-12): 말머리 배지 · 평점 강조 · 핵심 내용 · 제목은 잘리지 않는다
const CDN = "https://media.api-sports.io/football"

function ratingTone(r: number) {
  if (r >= 8) return "bg-score-amber text-pitch-night"
  if (r >= 7) return "bg-emerald-500 text-pitch-night"
  if (r >= 6) return "bg-turf-line text-floodlight"
  return "bg-red-500/80 text-floodlight"
}

const BADGE_TONE: Record<string, string> = {
  "경기 리포트": "bg-score-amber/20 text-score-amber",
  "K리그1": "bg-sky-400/20 text-sky-300",
  "주간 해외파": "bg-emerald-400/20 text-emerald-300",
  "주말 해외파 일정": "bg-emerald-400/20 text-emerald-300",
}

function visual(slug: string): { img: string | null; contain: boolean } {
  const kind = draftKindOf(slug)
  if (kind === "report") {
    const pid = slug.match(/match-report-(\d+)-\d+/)?.[1]
    return { img: pid ? `${CDN}/players/${pid}.png` : null, contain: false }
  }
  if (kind === "kleague") return { img: `${CDN}/leagues/292.png`, contain: true }
  return { img: null, contain: false }
}

function mdKst(iso: string) {
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000)
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`
}

export default function ColumnCard({ column: c, extra }: { column: Column; extra?: React.ReactNode }) {
  const info = columnCardInfo(c)
  const v = visual(c.slug)

  return (
    <Link
      href={`/columns/${c.slug}`}
      className="group flex flex-col gap-3 bg-turf/40 border border-turf-line/60 rounded-2xl p-4 sm:p-5 hover:border-score-amber/60 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs sm:text-sm font-semibold px-2.5 py-1 rounded-full ${BADGE_TONE[info.badge] ?? "bg-turf-line/60 text-floodlight/80"}`}>
          {info.badge}
        </span>
        {info.rating !== null && (
          <span className="flex items-center gap-1.5">
            <span className="text-xs text-floodlight/65">평점</span>
            <span className={`font-data text-xl font-bold px-2.5 py-0.5 rounded-lg ${ratingTone(info.rating)}`}>{info.rating.toFixed(1)}</span>
          </span>
        )}
        {!c.published && <span className="text-xs px-2 py-0.5 rounded bg-floodlight/10 text-floodlight/70">비공개</span>}
      </div>

      <div className="flex items-center gap-4">
        <div className="shrink-0 w-[72px] h-[72px] rounded-full ring-2 ring-score-amber/70 overflow-hidden bg-pitch-night flex items-center justify-center">
          {v.img ? (
            v.contain ? (
              <Logo src={v.img} alt="K리그1" className="w-3/5 h-3/5" />
            ) : (
              <PlayerAvatar src={v.img} alt={info.title} className="w-full h-full" />
            )
          ) : (
            <span className="font-display text-score-amber text-xl">GL</span>
          )}
        </div>
        <h3 className="text-base sm:text-lg font-semibold leading-snug text-floodlight group-hover:text-score-amber transition-colors">{info.title}</h3>
      </div>

      {info.lead && <p className="text-sm leading-relaxed text-floodlight/80 line-clamp-4">{info.lead}</p>}

      <p className="mt-auto text-xs text-floodlight/55">
        {mdKst(c.createdAt)}
        {extra}
      </p>
    </Link>
  )
}
