import { MOCK_TRANSFERS } from "@/lib/mockData"
import { fetchApiFootball } from "@/lib/apiFootballClient"
import { getCachedOrFetch } from "@/lib/apiCache"
import { devErrorOrSilent } from "@/lib/quietLog"

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
  33, 42, 40, 49, 47, 50,
  529, 541, 157, 165, 85, 530,
  497, 489,
]

// (2026-09-20) 기존엔 fetch를 직접 호출하고 errors 필드를 체크하지 않아서, API
// 레이트리밋 시 "이 클럽은 최근 이적이 없다"는 빈 배열로 오인될 수 있었다.
// fetchApiFootball()로 통합. 클럽 하나가 실패해도 나머지 13개 클럽은 정상 표시되도록
// 실패는 빈 배열로 처리한다 (위젯 전체가 죽는 것 방지).
async function getTeamTransfers(teamId: number): Promise<TransferEntry[]> {
  try {
    // (2026-10-11) DB 캐시 추가 — Next fetch 캐시만 믿었다가 경기 목록 페이지가 열릴 때마다
    // 14개 클럽 이적 조회(14콜)가 몇 분 간격으로 반복되는 게 API 로그에서 확인됨
    const path = `/transfers?team=${teamId}`
    return await getCachedOrFetch<TransferEntry[]>(path, 21600, async () => {
      const response = await fetchApiFootball(path, { revalidate: 21600 })
      return response as TransferEntry[]
    })
  } catch (err) {
    devErrorOrSilent(`getAllTransfers: team ${teamId} 이적 조회 실패:`, err instanceof Error ? err.message : err)
    return []
  }
}

export async function getAllTransfers(): Promise<TransferEntry[]> {
  if (process.env.USE_MOCK_DATA === "true") return MOCK_TRANSFERS

  const results = await Promise.all(FEATURED_CLUB_IDS.map((id) => getTeamTransfers(id)))
  const seen = new Map<number, TransferEntry>()
  for (const entries of results) {
    for (const entry of entries) {
      if (!entry.transfers?.[0]) continue
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
