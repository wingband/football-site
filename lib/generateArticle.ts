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

**2. 경기 리뷰 본문 (300~500단어, 기승전결 4단락)**
너는 20년 경력의 축구 전문 기자다. 술술 읽히는 스포츠 기사를 써야 한다.
각 단락은 3~5문장으로 짧게 끊어 써라. 한 문장에 정보를 욱여넣지 말고,
짧고 리듬감 있는 문장과 약간 긴 문장을 섞어서 리듬을 만들어라.

1단락 (기 — 훅): 이 경기에서 가장 인상적인 장면이나 결과를 첫 문장부터 던져서
  독자의 시선을 붙잡는다. 이어서 경기 전체를 한 줄로 요약한다.
2단락 (승 — 전개): 경기가 어떻게 흘러갔는지 시간 순서대로 짧게 그린다.
  주도권이 어디 있었는지, 흐름이 바뀐 지점을 짚되, 스탯(점유율·슈팅 등)은
  나열하지 말고 문장 속에 한두 개만 자연스럽게 녹여라.
3단락 (전 — 클라이맥스): 승부를 가른 결정적 장면을 몇 분에 무슨 일이 있었는지
  가장 생생하고 드라마틱하게 묘사한다. 관여한 선수 이름과 그 장면의 임팩트를
  집중적으로 그려서 이 단락이 기사에서 가장 눈에 띄게 만든다.
4단락 (결 — 마무리): 왜 이런 결과가 나왔는지 승패 요인을 짧게 정리하고,
  이 경기가 남긴 의미나 다음 경기에 대한 시사점으로 임팩트 있게 끝맺는다.

작성 규칙:
- 반드시 한국어, 신문 기사 문어체(~했다, ~였다)
- 소제목·목록·번호·마크다운 기호는 절대 쓰지 말고, 단락 사이는 빈 줄로만 구분한다
  (위 "1단락" 같은 표시를 본문에 적지 마라)
- 선수 이름은 한국어 표기로 통일 (예: Havertz → 하베르츠)
- 주어진 데이터에 없는 사실(관중 반응, 감독 발언, 부상 정보 등)은 절대 지어내지 마라
- 스탯을 문장으로 줄줄이 나열하는 건 절대 금지. 꼭 필요한 곳에만 써라
- SEO를 위해 중요함: 득점한 선수, 어시스트한 선수, 그 외 인상적인 활약을 보인 선수의
  실명을 기사 전체에서 여러 번(최소 2~3회씩) 반복해서 언급하라. "그는", "이 선수는" 같은
  대명사로만 계속 지칭하지 말고, 문단마다 실명을 다시 불러줘라

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
