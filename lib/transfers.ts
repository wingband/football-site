import { MOCK_TRANSFERS } from "@/lib/mockData"

export type TeamRef = { id: number; name: string; logo: string }

export type TransferEntry = {
  player: { id: number; name: string; photo?: string }
  update: string
  transfers: {
    date: string
    type: string | null
    teams: { in: TeamRef; out: TeamRef }
  }[]
}

const FEATURED_CLUB_IDS = [50, 42, 541, 529, 157, 165, 40, 85]

async function getTeamTransfers(teamId: number): Promise<TransferEntry[]> {
  const res = await fetch(`https://v3.football.api-sports.io/transfers?team=${teamId}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
    next: { revalidate: 3600 },
  })
  const data = await res.json()
  return data.response ?? []
}

export async function getAllTransfers(): Promise<TransferEntry[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TRANSFERS

  const results = await Promise.all(FEATURED_CLUB_IDS.map((id) => getTeamTransfers(id)))
  const seen = new Map<number, TransferEntry>()
  for (const entries of results) {
    for (const entry of entries) {
      if (!entry.transfers?.[0]) continue
      seen.set(entry.player.id, entry)
    }
  }
  return Array.from(seen.values()).sort(
    (a, b) => new Date(b.transfers[0].date).getTime() - new Date(a.transfers[0].date).getTime()
  )
}