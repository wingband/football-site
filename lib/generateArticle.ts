type ArticleInput = {
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  leagueName: string
  statsSummary: string
  eventsSummary: string
  goalsSummary: string
  koreanPlayerSummary?: string
}

type ArticleOutput = {
  title: string
  content: string
}

// (2026-09-21) 기존엔 "300~500단어" 식으로 분량을 지시했는데, 한국어는 "단어" 단위가
// 모호해서 GPT가 실제로는 훨씬 짧게(평균 748자, 중앙값 656자, 128건 중 109건이
// 800자 미만) 써내는 문제가 있었다. AdSense 심사 관점에서 콘텐츠 깊이가 부족해
// 보일 위험이 있어, 분량 기준을 명확한 "글자 수(공백 포함)"로 바꾸고, 생성 후
// 미달 시 자동으로 한 번 더 확장 요청하는 안전장치를 추가했다.
const BASE_MIN_LENGTH = 1300
const KOREAN_PLAYER_MIN_LENGTH = 2000

async function callOpenAI(prompt: string, maxTokens: number): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: maxTokens,
      // 기본값(1.0)에서는 경기 시각/스코어 같은 구체적 사실을 "그럴듯하게" 바꿔 쓰는
      // 경향이 있어서 크게 낮춰서 사실 충실도를 높인다
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error("OpenAI API 에러:", data)
    return ""
  }
  return data.choices?.[0]?.message?.content ?? ""
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

  const hasKoreanPlayer = Boolean(input.koreanPlayerSummary)
  const minLength = hasKoreanPlayer ? KOREAN_PLAYER_MIN_LENGTH : BASE_MIN_LENGTH

  const lengthGuide = hasKoreanPlayer
    ? "**2. 경기 리뷰 본문 (공백 포함 2200~2800자, 기승전결 + 한국 선수 파트 총 5~6단락)**"
    : "**2. 경기 리뷰 본문 (공백 포함 1400~1800자, 기승전결 4단락)**"

  const koreanPlayerParagraphGuide = hasKoreanPlayer
    ? `\n4단락 (한국 선수 집중 조명): 아래 "한국 선수 매치 스탯"에 나온 실제 기록(출전 시간, 평점,\n  골/도움, 포지션 등)을 근거로 이 선수가 경기에서 구체적으로 어떤 활약을 했는지 집중적으로\n  서술한다. 이 문단은 다른 문단보다 조금 더 길게 써서 이 선수에게 확실히 무게를 실어라.\n  주어진 스탯에 없는 장면(예: 특정 드리블, 특정 수비 상황)은 지어내지 말고, 주어진 숫자\n  (평점·출전시간·골·도움 등)를 바탕으로 그 활약상을 설명해라. 이 선수가 아직 교체 출전도\n  안 했거나 벤치에 머물렀다면, 그 사실 그대로(출전 안 함/벤치)를 솔직하게 언급하고\n  무리하게 활약을 지어내지 마라.\n5단락 (결 — 마무리): 왜 이런 결과가 나왔는지 승패 요인을 짧게 정리하고,\n  이 경기가 남긴 의미나 다음 경기에 대한 시사점으로 임팩트 있게 끝맺는다.`
    : `\n4단락 (결 — 마무리): 왜 이런 결과가 나왔는지 승패 요인을 짧게 정리하고,\n  이 경기가 남긴 의미나 다음 경기에 대한 시사점으로 임팩트 있게 끝맺는다.`

  const koreanPlayerDataBlock = hasKoreanPlayer
    ? `\n\n한국 선수 매치 스탯 (5단락 작성 시 이 숫자만 사용, 재계산/추측 금지):\n${input.koreanPlayerSummary}`
    : ""

  const prompt = `너는 축구 전문 기자야. 아래 경기 데이터를 바탕으로 두 가지를 작성해줘.

**1. 자극적인 기사 제목 (1줄)**
- 독자의 클릭을 유도하는 강렬한 헤드라인
- 승자/패자/인상적인 장면/선수명을 활용
- 구체적인 숫자나 임팩트 있는 표현 사용
- 예시: "아스날, 코벤트리를 박살내다 — 사카·하버츠 합작으로 3골 완승"
- 예시: "맨유, 굴욕의 홈패배 — 헐시티에 무릎 꿇으며 최악의 시즌 출발"
- 한국어로 작성, 30자 내외

${lengthGuide}
너는 20년 경력의 축구 전문 기자다. 술술 읽히는 스포츠 기사를 써야 한다.
각 단락은 3~5문장으로 짧게 끊어 써라. 한 문장에 정보를 욱여넣지 말고,
짧고 리듬감 있는 문장과 약간 긴 문장을 섞어서 리듬을 만들어라.

**분량 기준은 "단어 수"가 아니라 "글자 수(공백 포함)"다.** 위에 명시된 글자 수
범위를 반드시 채워야 하고, 그 아래로 짧게 쓰면 안 된다. 각 단락에서 경기 흐름,
팀의 전술적 특징, 그 골/카드/교체가 경기 전체에 미친 영향 등 주어진 데이터로부터
합리적으로 추론 가능한 범위의 서술을 덧붙여서 분량을 채워라. 다만 이미 있는
사실을 부풀리거나 없는 사실(관중 반응, 감독 발언 등)을 지어내서 채우면 안 된다 —
분량은 "묘사와 설명의 깊이"로 채우는 것이지 "없는 사실 추가"로 채우는 게 아니다.

1단락 (기 — 훅): 이 경기에서 가장 인상적인 장면이나 결과를 첫 문장부터 던져서
  독자의 시선을 붙잡는다. 이어서 경기 전체를 한 줄로 요약한다.
2단락 (승 — 전개): 경기가 어떻게 흘러갔는지 시간 순서대로 짧게 그린다.
  주도권이 어디 있었는지, 흐름이 바뀐 지점을 짚되, 스탯(점유율·슈팅 등)은
  나열하지 말고 문장 속에 한두 개만 자연스럽게 녹여라.
3단락 (전 — 클라이맥스): 승부를 가른 결정적 장면을 몇 분에 무슨 일이 있었는지
  가장 생생하고 드라마틱하게 묘사한다. 관여한 선수 이름과 그 장면의 임팩트를
  집중적으로 그려서 이 단락이 기사에서 가장 눈에 띄게 만든다.${koreanPlayerParagraphGuide}

작성 규칙:
- 반드시 한국어, 신문 기사 문어체(~했다, ~였다)
- 소제목·목록·번호·마크다운 기호는 절대 쓰지 말고, 단락 사이는 빈 줄로만 구분한다
  (위 "1단락" 같은 표시를 본문에 적지 마라)
- 선수 이름은 자연스러운 한국어 표기로 써도 좋다 (예: Havertz → 하베르츠). 단, 이건
  "실제 그 선수의 정확한 한글 표기를 안다"는 전제에서만 하는 것이다.
  절대로 이니셜이나 축약된 이름(예: "J. Son", "K. Kim")을 실제 유명 선수의 풀네임으로
  "확장 해석"하지 마라. 예를 들어 "J. Son"이라는 이름만 주어졌다고 해서 이걸 무조건
  손흥민이라고 단정해서 쓰면 절대 안 된다 — 이니셜만으로는 어떤 손 씨 선수인지 알 수
  없으니, 실제로 유명한 그 선수라는 확증이 없으면 주어진 이름(J. Son)을 그대로 쓰거나
  로마자 표기를 그대로 사용해라. 실존 인물의 이름을 함부로 가져다 붙이면 심각한 오보가
  된다는 걸 명심해라
- 주어진 데이터에 없는 사실(관중 반응, 감독 발언, 부상 정보 등)은 절대 지어내지 마라
- 스탯을 문장으로 줄줄이 나열하는 건 절대 금지. 꼭 필요한 곳에만 써라
- SEO를 위해 중요함: 득점한 선수, 어시스트한 선수, 그 외 인상적인 활약을 보인 선수의
  실명을 기사 전체에서 여러 번(최소 2~3회씩) 반복해서 언급하라. "그는", "이 선수는" 같은
  대명사로만 계속 지칭하지 말고, 문단마다 실명을 다시 불러줘라
- 경기 장면의 시각은 아래 "주요 이벤트"에 이미 "전반 X분"/"후반 X분"으로 정확히 표시돼 있다.
  본문에 시각을 언급할 때는 반드시 그 숫자를 정확히 그대로 인용해라.
  절대로 임의로 다른 숫자를 만들거나, 15분·37분 같은 어색한(정확한) 숫자를
  30분·45분처럼 "그럴듯한" 숫자로 바꿔 쓰지 마라. 예를 들어 이벤트에 "전반 15분"이라고
  써있으면 본문에도 정확히 "전반 15분"이라고 써야 하고, 절대 "전반 30분"처럼 바꾸면 안 된다.
  스스로 계산하거나 반올림하지 말고, 주어진 숫자를 그대로 복사해서 써라
- 아래 "주요 이벤트"의 각 항목에는 [팀명]과 그 시점의 스코어가 정확히 표시돼 있다.
  득점/카드/교체가 어느 팀 소속인지는 반드시 그 [팀명] 표시를 그대로 따라야 한다.
  절대로 ${input.homeTeam}(홈)과 ${input.awayTeam}(원정) 선수를 헷갈리거나 뒤바꿔 쓰지 마라.
  예를 들어 이벤트에 "[${input.awayTeam}] Goal - 선수A (스코어 0-1)"이라고 되어 있으면
  이건 ${input.awayTeam}(원정팀)의 골이다. 절대 ${input.homeTeam}의 골로 착각해서 쓰지 마라.
  경기 흐름(누가 몇 대 몇으로 앞섰는지)도 이벤트에 표시된 스코어 순서를 그대로 따라야 한다
- 아래 "정확한 득점 기록"은 이미 정답이 계산되어 있는 표다. 몇 번째 골인지, 몇 분에,
  어느 팀 선수가, 도움은 누구였는지, 그 골 이후 스코어가 몇 대 몇이 됐는지 — 이 5가지를
  절대 재계산하거나 다르게 서술하지 마라. 특히 아래를 반드시 지켜라:
  * "이 팀의 첫 골"이라고 쓰려면 그 팀 소속 골 중 실제로 "1번째"로 표시된 골에만 써라.
  * 아래 득점 기록의 각 골 줄 끝 [ ] 안에는 그 골이 선제골/동점골/역전골/추가골 중
    무엇인지 이미 계산되어 있다. "역전골"이라는 표현은 반드시 [ ] 안에 "역전골"이라고
    명시된 골에만 써라 — 그 외의 골에 "역전골"을 붙이면 실제로 없었던 장면을 지어내는
    심각한 오보가 된다. 나머지는 표시된 그대로 "선제골"/"동점골"/"추가골" 같은 표현만
    사용하고, 표시에 없는 상태를 임의로 만들어내지 마라.
  * 같은 골(같은 선수, 같은 분, 같은 스코어)을 본문 안에서 두 번 다른 장면인 것처럼
    묘사하지 마라. 정확한 득점 기록에 있는 골 개수만큼만 언급해라.
  * 최종 스코어는 반드시 "정확한 득점 기록"의 마지막 줄 스코어와 일치해야 한다
  * "전반에만 N골을 몰아넣으며" 같이 특정 팀이 전반(또는 후반)에 몇 골을 넣었는지
    요약해서 말하고 싶으면, 반드시 "정확한 득점 기록" 맨 아래 [전/후반 팀별 득점
    개수] 블록에 있는 그 팀의 숫자와 정확히 일치시켜라. 상대팀이 그 전반/후반에
    넣은 골까지 우리 팀 골로 합쳐서 세면 절대 안 된다. 예를 들어 전반에 총 4골이
    나왔어도 그중 우리 팀 게 3골, 상대 팀 게 1골이면 "전반에 3골"이라고 써야지
    "전반에 4골"이라고 쓰면 안 된다

정확한 득점 기록 (그대로 사용, 재계산 금지):
${input.goalsSummary}

리그: ${input.leagueName}
${input.homeTeam} ${input.homeScore ?? "-"} : ${input.awayScore ?? "-"} ${input.awayTeam}
${winner ? `승자: ${winner}` : "무승부"}
주요 스탯: ${input.statsSummary}
주요 이벤트(득점/카드/교체 — 참고용, 세부 서술 시 활용): ${input.eventsSummary}${koreanPlayerDataBlock}

아래 형식으로 정확히 출력해:
TITLE: [제목]
CONTENT: [본문]`

  // 한국어 1400~1800자는 토큰을 많이 먹는다 (한국어는 음절 단위 토크나이징 특성상
  // 글자당 토큰 소비가 영어보다 크다). 넉넉하게 잡아서 문장이 중간에 잘리지 않게 한다
  const maxTokens = hasKoreanPlayer ? 4500 : 3000

  const raw = await callOpenAI(prompt, maxTokens)
  if (!raw) return null

  const parse = (text: string): ArticleOutput => {
    const titleMatch = text.match(/TITLE:\s*(.+)/i)
    const contentMatch = text.match(/CONTENT:\s*([\s\S]+)/i)
    if (!titleMatch || !contentMatch) {
      return {
        title: `${input.homeTeam} ${input.homeScore ?? "-"}-${input.awayScore ?? "-"} ${input.awayTeam} — ${input.leagueName} 경기 리뷰`,
        content: text,
      }
    }
    return { title: titleMatch[1].trim(), content: contentMatch[1].trim() }
  }

  let result = parse(raw)

  // (2026-09-21) GPT가 여전히 목표 분량에 못 미치면, 이미 쓴 초안을 그대로 주고
  // "사실은 그대로 두고 묘사만 더 채워서 확장하라"고 한 번 더 요청한다. 무한 재시도는
  // 비용/시간 낭비라 최대 1회만 시도한다.
  if (result.content.length < minLength) {
    const expandPrompt = `아래는 축구 경기 리뷰 기사 초안이다. 사실 관계(스코어, 득점자, 시간, 팀명 등)는
절대 바꾸지 말고, 각 단락에 경기 흐름·전술적 배경·그 장면이 승부에 미친 영향에 대한
묘사와 설명을 추가해서 전체 분량을 공백 포함 ${minLength}~${minLength + 400}자로 확장해라.
없는 사실(관중 반응, 감독 발언 등)을 새로 지어내면 안 된다. 마크다운이나 소제목 없이
본문 텍스트만 출력해라.

[참고용 원본 데이터 — 사실 확인용, 재계산 금지]
${input.goalsSummary}

[현재 초안]
${result.content}`

    const expanded = await callOpenAI(expandPrompt, maxTokens)
    if (expanded && expanded.trim().length > result.content.length) {
      result = { title: result.title, content: expanded.trim() }
    }
  }

  return result
}
