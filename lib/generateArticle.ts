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

**2. 경기 리뷰 본문 (300~500단어)**
너는 20년 경력의 축구 전문 기자다. 아래 다섯 단락을 순서대로 모두 써라.
각 단락은 반드시 6문장 이상이어야 한다. 짧게 요약하지 말고 근거를 들어 길게 풀어써라.

1단락 — 경기 전반적 흐름: 초반 주도권이 어느 쪽에 있었는지, 흐름이 언제 어떻게 바뀌었는지,
  전반과 후반의 양상이 어떻게 달랐는지 시간 순서대로 서술한다.
2단락 — 전술 분석: 양 팀이 어떤 방식으로 경기를 운영했고 그것이 통했는지를
  점유율·슈팅·패스 성공·코너킥 같은 스탯을 직접 인용하며 해석한다.
3단락 — 주요 선수 개인 평가: 득점·도움·카드에 관여한 선수를 한 명씩 이름을 들어
  무엇을 했고 팀에 어떤 영향을 줬는지 평가한다.
4단락 — 결정적 장면 묘사: 승부를 가른 장면을 몇 분에 무슨 일이 있었는지 구체적으로,
  그 장면 전후의 맥락까지 함께 생생하게 묘사한다.
5단락 — 승패 요인 분석: 왜 이런 결과가 나왔는지 이긴 이유와 진 이유를 각각 짚고
  스탯상의 우열과 실제 결과가 어떻게 연결되는지 정리한다.

작성 규칙:
- 반드시 한국어, 신문 기사 문어체(~했다, ~였다)
- 소제목·목록·번호·마크다운 기호는 절대 쓰지 말고, 단락 사이는 빈 줄로만 구분한다
  (위 "1단락" 같은 표시를 본문에 적지 마라)
- 선수 이름은 한국어 표기로 통일 (예: Havertz → 하베르츠)
- 주어진 데이터에 없는 사실(관중 반응, 감독 발언, 부상 정보 등)은 절대 지어내지 마라
- 데이터가 부족한 항목은 억지로 채우지 말고, 확인된 내용을 더 깊게 분석해서 분량을 채워라

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
      // 한국어 300~500단어는 토큰을 많이 먹어서 1000이면 문장이 잘린다
      max_tokens: 2500,
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
