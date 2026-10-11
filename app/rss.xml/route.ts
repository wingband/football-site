import { getColumns } from "@/lib/columns"
import { SITE_URL } from "@/lib/siteConfig"

// 칼럼 RSS 피드 (2026-10-11). 네이버 서치어드바이저 "RSS 제출"에 https://www.goalline.me/rss.xml 로 등록 (사이트 정규 주소가 www라서 네이버에도 www 사이트로 등록해야 함)해서
// 새 칼럼을 발행하면 네이버가 알아서 수집하게 한다. 공개된 칼럼만 최신 50개.

export const revalidate = 600

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")

// 본문 마크다운 → 요약용 평문 (이미지·기호 제거)
function plain(md: string, max = 300) {
  return md
    .replace(/^!\[.*$/gm, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^>\s*✍️.*$/gm, "")
    .replace(/[#>*_`~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
}

export async function GET() {
  const columns = (await getColumns({ limit: 50 })).filter((c) => c.published)
  const base = SITE_URL.replace(/\/$/, "")
  const lastBuild = columns[0]?.updatedAt ?? new Date().toISOString()

  const items = columns
    .map((c) => {
      const url = `${base}/columns/${c.slug}`
      // 네이버는 피드 안의 모든 URL이 소유확인된 도메인이어야 받아준다.
      // 카드 이미지는 Vercel Blob(다른 도메인)에 있어서 enclosure로 넣으면 "형식이 올바르지 않습니다"로 거절됨 →
      // 우리 도메인 주소일 때만 넣는다. (이미지는 칼럼 페이지의 og:image로 어차피 수집됨)
      const found = c.content.match(/^!\[[^\]]*\]\((https:\/\/[^\s)]+)\)\s*$/m)?.[1]
      const image = found?.startsWith(base) ? found : undefined
      return `    <item>
      <title>${esc(c.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(c.summary || plain(c.content))}</description>
      <pubDate>${new Date(c.createdAt).toUTCString()}</pubDate>
${c.tags.slice(0, 10).map((t) => `      <category>${esc(t)}</category>`).join("\n")}${image ? `\n      <enclosure url="${esc(image)}" type="image/png" length="0" />` : ""}
    </item>`
    })
    .join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>GoalLine 칼럼</title>
    <link>${base}/columns</link>
    <description>한국인 해외파 활약, K리그 라운드 정리, 경기 리포트 — GoalLine 축구 칼럼</description>
    <language>ko</language>
    <lastBuildDate>${new Date(lastBuild).toUTCString()}</lastBuildDate>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=600" },
  })
}
