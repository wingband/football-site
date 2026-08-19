type ArticleInput = {
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  leagueName: string
  statsSummary: string
  eventsSummary: string
}

export async function generateMatchArticle(input: ArticleInput): Promise<string> {
  if (process.env.USE_MOCK_DATA === "true") {
    return `${input.homeTeam}와 ${input.awayTeam}의 ${input.leagueName} 경기가 ${input.homeScore}:${input.awayScore}로 끝났다. (이 문단은 가짜 데이터 모드의 샘플 기사입니다.) 실제 운영 시 이 자리에는 AI가 경기 통계와 주요 장면을 바탕으로 작성한 6~8문장 분량의 상세 리뷰가 들어갑니다. 여기에는 승부처가 된 장면, 양 팀의 전술적 특징, 눈에 띄는 활약을 펼친 선수, 그리고 이 결과가 순위表에 미치는 영향 등이 포함될 예정입니다.`
  }

  const prompt = `너는 축구 전문 기자야. 아래 경기 데이터를 바탕으로, 6~8문장 분량의 경기 리뷰 기사를 한국어로 써줘.

작성 지침:
- 단순 스코어 나열이 아니라, 승부처가 된 장면과 그 배경을 짚어줘
- 팀 스탯(점유율, 슈팅 수 등) 중 의미 있는 것만 골라 자연스럽게 문장에 녹여줘
- 과장하거나 없는 사실을 지어내지 말고, 주어진 데이터에 근거해서만 써줘
- 문어체 기사 톤을 유지하고, 소제목이나 목록 없이 이어지는 문단으로 작성해줘

리그: ${input.leagueName}
${input.homeTeam} ${input.homeScore ?? "-"} : ${input.awayScore ?? "-"} ${input.awayTeam}
주요 스탯: ${input.statsSummary}
주요 이벤트(득점/카드/교체): ${input.eventsSummary}

기사 본문만 출력하고, 다른 설명은 붙이지 마.`

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error("OpenAI API 에러 (기사 생성):", data)
    return ""
  }

  return data.choices?.[0]?.message?.content ?? ""
}