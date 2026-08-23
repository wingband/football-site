type ArticleInput = {
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  leagueName: string
  statsSummary: string
  eventsSummary: string
}

type ArticleOutput = {
  title: string
  content: string
}

export async function generateMatchArticle(input: ArticleInput): Promise<ArticleOutput | null> {
  if (process.env.USE_MOCK_DATA === "true") {
    return {
      title: `${input.homeTeam}, ${input.awayTeam}에 ${input.homeScore}:${input.awayScore} 완승 — 압도적 경기력으로 승점 3 획득`,
      content: `${input.homeTeam}와 ${input.awayTeam}의 ${input.leagueName} 경기가 ${input.homeScore}:${input.awayScore}로 끝났다. (샘플 기사)`,
    }
  }

  const winner = input.homeScore !== null && input.awayScore !== null
    ? input.homeScore > input.awayScore ? input.homeTeam
    : input.awayScore > input.homeScore ? input.awayTeam
    : null
    : null

  const prompt = `너는 축구 전문 기자야. 아래 경기 데이터를 바탕으로 두 가지를 작성해줘.

**1. 자극적인 기사 제목 (1줄)**
- 독자의 클릭을 유도하는 강렬한 헤드라인
- 승자/패자/인상적인 장면/선수명을 활용
- 구체적인 숫자나 임팩트 있는 표현 사용
- 예시: "아스날, 코벤트리를 박살내다 — 사카·하버츠 합작으로 3골 완승"
- 예시: "맨유, 굴욕의 홈패배 — 헐시티에 무릎 꿇으며 최악의 시즌 출발"
- 한국어로 작성, 30자 내외

**2. 경기 리뷰 본문 (6~8문장)**
- 승부처가 된 장면과 그 배경
- 팀 스탯 중 의미 있는 것만 자연스럽게 녹여서
- 없는 사실 지어내지 말고 주어진 데이터 근거로만
- 문어체 기사 톤, 소제목/목록 없이 이어지는 문단

리그: ${input.leagueName}
${input.homeTeam} ${input.homeScore ?? "-"} : ${input.awayScore ?? "-"} ${input.awayTeam}
${winner ? `승자: ${winner}` : "무승부"}
주요 스탯: ${input.statsSummary}
주요 이벤트(득점/카드/교체): ${input.eventsSummary}

아래 형식으로 정확히 출력해:
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
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error("OpenAI API 에러 (기사 생성):", data)
    return null
  }

  const raw = data.choices?.[0]?.message?.content ?? ""
  const titleMatch = raw.match(/TITLE:\s*(.+)/i)
  const contentMatch = raw.match(/CONTENT:\s*([\s\S]+)/i)

  if (!titleMatch || !contentMatch) {
    // 파싱 실패 시 전체를 content로, 기본 제목 사용
    return {
      title: `${input.homeTeam} ${input.homeScore ?? "-"}-${input.awayScore ?? "-"} ${input.awayTeam} — ${input.leagueName} 경기 리뷰`,
      content: raw,
    }
  }

  return {
    title: titleMatch[1].trim(),
    content: contentMatch[1].trim(),
  }
}
