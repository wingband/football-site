import Link from "next/link"
import AdSlot from "@/components/AdSlot"
import PlayerAvatar from "@/components/PlayerAvatar"
import { getAllTransfers } from "@/lib/transfers"
import type { Metadata } from "next"
import Logo from "@/components/Logo"

export const metadata: Metadata = {
  title: "이적 센터 — GoalLine",
  description: "최신 축구 이적 소식. 주요 클럽 선수 이동 현황을 확인하세요.",
}

// 이적 타입별 색상 + 라벨
function TransferTypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-[10px] text-floodlight/30 font-data">–</span>

  const t = type.toLowerCase()
  let label = type
  let cls = "text-floodlight/50 bg-turf-line/30"

  if (t === "transfer" || t === "permanent") {
    label = "Transfer"
    cls = "text-score-amber bg-score-amber/10"
  } else if (t.includes("loan")) {
    label = "Loan"
    cls = "text-blue-400 bg-blue-400/10"
  } else if (t === "free") {
    label = "Free"
    cls = "text-green-400 bg-green-400/10"
  } else if (t === "end of loan") {
    label = "Loan End"
    cls = "text-orange-400 bg-orange-400/10"
  }

  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-data uppercase ${cls}`}>
      {label}
    </span>
  )
}

// 날짜 → 상대 표시
function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "오늘"
  if (diffDays === 1) return "어제"
  if (diffDays < 7) return `${diffDays}일 전`
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

export default async function TransfersPage() {
  const transfers = await getAllTransfers()

  // 날짜별 그룹핑
  const groups = new Map<string, typeof transfers>()
  for (const entry of transfers) {
    const t = entry.transfers[0]
    const label = formatRelativeDate(t.date)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(entry)
  }

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-4xl mx-auto px-4 pb-16">
        {/* 헤더 */}
        <div className="pt-8 pb-4 border-b border-turf-line/40 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display uppercase text-xl text-score-amber tracking-wide">
                이적 센터
              </h1>
              <p className="text-xs text-floodlight/40 mt-1">주요 클럽 최근 60일 이적 소식</p>
            </div>
            {/* 범례 */}
            <div className="hidden sm:flex items-center gap-3 text-[10px]">
              <span className="text-score-amber bg-score-amber/10 px-2 py-0.5 rounded font-bold">Transfer</span>
              <span className="text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded font-bold">Loan</span>
              <span className="text-green-400 bg-green-400/10 px-2 py-0.5 rounded font-bold">Free</span>
            </div>
          </div>
        </div>

        <AdSlot label="이적 센터 배너 광고 (예: 728x90)" className="w-full h-16 mb-6" />

        {transfers.length === 0 && (
          <p className="text-floodlight/40 text-sm py-10 text-center">최근 이적 정보가 없습니다.</p>
        )}

        {/* 날짜별 섹션 */}
        <div className="space-y-8">
          {Array.from(groups.entries()).map(([dateLabel, entries]) => (
            <div key={dateLabel}>
              {/* 날짜 구분선 */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-floodlight/60">{dateLabel}</span>
                <div className="flex-1 h-px bg-turf-line/30" />
              </div>

              {/* 이적 테이블 헤더 */}
              <div className="hidden sm:grid grid-cols-[1fr_auto_1fr_100px] gap-4 px-4 pb-2 text-[10px] uppercase text-floodlight/30 tracking-wide">
                <span>원래 소속</span>
                <span className="text-center w-24">이적 대상</span>
                <span>선수</span>
                <span className="text-right">타입 / 날짜</span>
              </div>

              {/* 이적 목록 */}
              <div className="bg-turf/30 border border-turf-line/30 rounded-md divide-y divide-turf-line/20 overflow-hidden">
                {entries.map((entry) => {
                  const t = entry.transfers[0]
                  return (
                    <Link
                      key={entry.player.id}
                      href={`/players/${entry.player.id}`}
                      className="group flex items-center gap-3 px-4 py-3.5 hover:bg-turf-line/20 transition-colors"
                    >
                      {/* 원래 소속팀 */}
                      <div className="flex items-center gap-2 w-[22%] min-w-0">
                        <Logo src={t.teams.out.logo} alt="" className="w-7 h-7 shrink-0" />
                        <span className="text-xs text-floodlight/50 truncate hidden sm:block">
                          {t.teams.out.name}
                        </span>
                      </div>

                      {/* 화살표 + 이적 대상팀 */}
                      <div className="flex items-center gap-2 w-[22%] min-w-0">
                        {/* 이적 타입별 화살표 */}
                        <span className={`text-sm shrink-0 ${
                          (t.type ?? "").toLowerCase().includes("loan") ? "text-blue-400" :
                          (t.type ?? "").toLowerCase() === "free" ? "text-green-400" :
                          "text-score-amber"
                        }`}>
                          {(t.type ?? "").toLowerCase().includes("loan") ? "⇄" : "→"}
                        </span>
                        <Logo src={t.teams.in.logo} alt="" className="w-7 h-7 shrink-0" />
                        <span className="text-xs text-floodlight/50 truncate hidden sm:block">
                          {t.teams.in.name}
                        </span>
                      </div>

                      {/* 선수 정보 */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <PlayerAvatar
                          src={entry.player.photo ?? ""}
                          alt={entry.player.name}
                          className="w-9 h-9 rounded-full bg-turf-line object-cover shrink-0 text-xs"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-floodlight group-hover:text-score-amber transition-colors truncate">
                            {entry.player.name}
                          </p>
                          {/* 모바일: 팀명을 선수 이름 아래 표시 */}
                          <div className="flex items-center gap-1 sm:hidden mt-0.5">
                            <Logo src={t.teams.out.logo} alt="" className="w-3 h-3" />
                            <span className="text-[10px] text-floodlight/40 truncate">{t.teams.out.name}</span>
                            <span className="text-[10px] text-floodlight/30">→</span>
                            <Logo src={t.teams.in.logo} alt="" className="w-3 h-3" />
                            <span className="text-[10px] text-floodlight/40 truncate">{t.teams.in.name}</span>
                          </div>
                        </div>
                      </div>

                      {/* 타입 + 날짜 */}
                      <div className="flex flex-col items-end gap-1 shrink-0 w-20">
                        <TransferTypeBadge type={t.type} />
                        <span className="text-[10px] text-floodlight/30 font-data">
                          {new Date(t.date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-floodlight/20 mt-8 text-center">
          주요 클럽 기준 집계 · API-Football 제공 · 이적료 데이터 미포함
        </p>
      </div>
    </main>
  )
}
