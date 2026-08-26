import { MOCK_TRANSFERS } from "@/lib/mockData"

export type TeamRef = { id: number; name: string; logo: string }

export type TransferEntry = {
  player: { id: number; name: string; photo?: string; position?: string }
  update: string
  transfers: {
    date: string
    type: string | null
    teams: { in: TeamRef; out: TeamRef }
  }[]
}

const FEATURED_CLUB_IDS = [
  // 빅6 PL
  33, 42, 40, 49, 47, 50,
  // 빅 유럽
  529, 541, 157, 165, 85, 530,
  // 추가
  497, 489,
]

async function getTeamTransfers(teamId: number): Promise<TransferEntry[]> {
  // 14개 클럽을 매번 한꺼번에 호출하는 데다 이 함수가 /matches 페이지의
  // TransferWidget에서도 쓰여서 트래픽이 가장 많다. lib/teamData.ts의
  // 동명 함수와 값을 맞춰(21600) 캐시 파편화도 같이 줄인다
  const res = await fetch(`https://v3.football.api-sports.io/transfers?team=${teamId}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
    next: { revalidate: 21600 },
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
      // 최근 60일 이내 이적만
      const transferDate = new Date(entry.transfers[0].date)
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 60)
      if (transferDate < cutoff) continue

      seen.set(entry.player.id, {
        ...entry,
        player: {
          ...entry.player,
          photo: `https://media.api-sports.io/football/players/${entry.player.id}.png`,
        },
      })
    }
  }
  return Array.from(seen.values()).sort(
    (a, b) => new Date(b.transfers[0].date).getTime() - new Date(a.transfers[0].date).getTime()
  )
}