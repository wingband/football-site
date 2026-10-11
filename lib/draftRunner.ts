import { generateWeeklyKoreanDraft } from "@/lib/generateWeeklyColumn"
import { generateWeekendScheduleDraft } from "@/lib/drafts/weekend"
import { generateMatchReportDrafts } from "@/lib/drafts/matchReports"
import { generateKLeagueRoundDraft } from "@/lib/drafts/kleague"
import { DRAFT_KINDS, type DraftKind } from "@/lib/draftEngine"
import { deleteColumn, getColumns } from "@/lib/columns"

export type RunResult = { ok: boolean; slug?: string; slugs?: string[]; created?: boolean; error?: string; skipped?: number }

// 초안 종류별 실행기 — 크론과 관리자 버튼이 함께 쓴다
export async function runDraft(kind: DraftKind, refreshDraft = false): Promise<RunResult> {
  switch (kind) {
    case "weekly":
      return await generateWeeklyKoreanDraft({ refreshDraft })
    case "weekend":
      return await generateWeekendScheduleDraft({ refreshDraft })
    case "kleague":
      return await generateKLeagueRoundDraft({ refreshDraft })
    case "report": {
      const r = await generateMatchReportDrafts()
      return r.created.length
        ? { ok: true, slugs: r.created, slug: r.created[0], created: true, skipped: r.skipped }
        : { ok: false, error: "최근 48시간 안에 30분 이상 뛴 해외파 경기 중 새로 만들 리포트가 없어요", skipped: r.skipped }
    }
  }
}

// 발행 안 하고 7일 넘게 지난 경기 리포트 초안은 정리한다 (검색 가치가 사라지고 목록만 어지럽힘)
export async function cleanupStaleReportDrafts(): Promise<number> {
  const cols = await getColumns({ includeDrafts: true, limit: 200 })
  const stale = cols.filter(
    (c) => !c.published && c.slug.includes(DRAFT_KINDS.report.mark) && Date.now() - new Date(c.createdAt).getTime() > 7 * 86400_000
  )
  for (const c of stale) await deleteColumn(c.slug)
  return stale.length
}
