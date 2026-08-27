import Link from "next/link"
import PlayerAvatar from "@/components/PlayerAvatar"
import { getAllTransfers } from "@/lib/transfers"
import Logo from "@/components/Logo"

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}.${d.getDate()}`
}

export default async function TransferWidget() {
  const all = await getAllTransfers()
  const top = all.slice(0, 4)

  if (top.length === 0) return null

  return (
    <div className="bg-turf/40 border-l-2 border-score-amber">
      <div className="flex items-center justify-between px-4 py-3 border-b border-turf-line/60">
        <h2 className="font-display uppercase text-sm text-floodlight/70">주요 이적</h2>
        <Link href="/transfers" className="text-[11px] text-floodlight/40 hover:text-score-amber">
          더보기 →
        </Link>
      </div>
      <div>
        {top.map((entry) => {
          const t = entry.transfers[0]
          return (
            <Link
              key={entry.player.id}
              href={`/players/${entry.player.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-turf-line/40 border-b border-turf-line/40 last:border-b-0"
            >
              <PlayerAvatar
                src={entry.player.photo}
                alt={entry.player.name}
                className="w-9 h-9 rounded-full bg-turf-line object-cover shrink-0 text-xs"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{entry.player.name}</p>
                <div className="flex items-center gap-1 mt-0.5 text-[10px] text-floodlight/40">
                  <Logo src={t.teams.out.logo} alt="" className="w-3 h-3" />
                  <span className="truncate max-w-[60px]">{t.teams.out.name}</span>
                  <span>→</span>
                  <Logo src={t.teams.in.logo} alt="" className="w-3 h-3" />
                  <span className="truncate max-w-[60px]">{t.teams.in.name}</span>
                </div>
              </div>
              <span className="text-[10px] font-data text-score-amber shrink-0">
                {formatDate(t.date)}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}