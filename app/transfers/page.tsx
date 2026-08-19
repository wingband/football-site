import Link from "next/link"
import { getAllTransfers } from "@/lib/transfers"

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}.${d.getDate()}`
}

export default async function TransfersPage() {
  const sorted = await getAllTransfers()

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
      <div className="max-w-xl mx-auto">
        <h1 className="font-display uppercase text-xl text-score-amber mb-1">이적 센터</h1>
        <p className="text-xs text-floodlight/40 mb-6">
          주요 클럽 기준 최근 이적 소식
        </p>

        {sorted.length === 0 && (
          <p className="text-floodlight/40 text-sm">최근 이적 정보가 없습니다.</p>
        )}

        <div className="bg-turf/40 border-l-2 border-score-amber">
          {sorted.map((entry) => {
            const t = entry.transfers[0]
            return (
              <Link
                key={entry.player.id}
                href={`/players/${entry.player.id}`}
                className="flex items-center gap-3 px-4 py-4 hover:bg-turf-line/40 border-b border-turf-line/40 last:border-b-0"
              >
                <img
                  src={entry.player.photo}
                  alt=""
                  className="w-10 h-10 rounded-full bg-turf-line object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.player.name}</p>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-floodlight/50">
                    <img src={t.teams.out.logo} alt="" className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[80px]">{t.teams.out.name}</span>
                    <span className="text-floodlight/30">→</span>
                    <img src={t.teams.in.logo} alt="" className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[80px]">{t.teams.in.name}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-data text-score-amber">{t.type ?? "-"}</p>
                  <p className="text-[10px] text-floodlight/30 mt-0.5">{formatDate(t.date)}</p>
                </div>
              </Link>
            )
          })}
        </div>

        <p className="text-[11px] text-floodlight/30 mt-6 leading-relaxed">
          이 목록은 일부 주요 클럽의 이적 기록만 모은 것으로, 전체 이적 시장을 다루지 않습니다.
        </p>
      </div>
    </main>
  )
}