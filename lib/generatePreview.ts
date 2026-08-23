type PreviewInput = {
  homeTeam: string
  awayTeam: string
  leagueName: string
  kickoffAt: string
  h2hSummary?: string
  homeForm?: string
  awayForm?: string
}

export async function generateMatchPreview(input: PreviewInput): Promise<{ title: string; content: string } | null> {
  if (process.env.USE_MOCK_DATA === "true") return null

  const kickoff = new Date(input.kickoffAt).toLocaleString("ko-KR", {
    month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul"
  })

  const prompt = `너는 축구 전문 기자야. 아래 경기 정보를 바탕으로 두 가지를 작성해줘.

**1. 클릭을 유도하는 프리뷰 제목 (1줄)**
- 오늘 밤/이번 주말 경기를 예고하는 강렬한 헤드라인
- 관전 포인트나 기대감을 담아서
- 예시: "맨시티 vs 리버풀 — 오늘 밤 프리미어리그 최대 빅매치 관전 포인트 3가지"
- 한국어, 35자 내외

**2. 경기 프리뷰 본문 (6~8문장)**
- 양 팀의 현재 폼과 상황
- 주목해야 할 선수나 전술적 포인트
- 역대 맞대결(H2H) 흐름
- 예상 관전 포인트
- 사실에 근거해서 작성, 없는 내용 지어내지 말 것
- 문어체 기사 톤

리그: ${input.leagueName}
경기: ${input.homeTeam} vs ${input.awayTeam}
킥오프: ${kickoff} (한국 시간)
${input.homeForm ? `홈팀 최근 폼: ${input.homeForm}` : ""}
${input.awayForm ? `원정팀 최근 폼: ${input.awayForm}` : ""}
${input.h2hSummary ? `최근 맞대결: ${input.h2hSummary}` : ""}

아래 형식으로 정확히 출력:
TITLE: [제목]
CONTENT: [본문]`

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 900,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  const data = await res.json()
  if (!res.ok) return null

  const raw = data.choices?.[0]?.message?.content ?? ""
  const titleMatch = raw.match(/TITLE:\s*(.+)/i)
  const contentMatch = raw.match(/CONTENT:\s*([\s\S]+)/i)

  if (!titleMatch || !contentMatch) return null

  return {
    title: titleMatch[1].trim(),
    content: contentMatch[1].trim(),
  }
}
