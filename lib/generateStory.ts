import { getCachedStory, saveCachedStory } from "@/lib/storyCache"

const FAILED_MESSAGE = "스토리를 생성하지 못했습니다."

type StoryInput = {
  matchId: number
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  leagueName: string
  statsSummary: string
  // 실제 골 기록(몇 분에, 누가, 도움은 누구, 그 골 이후 스코어, 그리고 그 골이
  // 선제/동점/역전/추가골 중 무엇인지까지 이미 계산되어 있는 정답표).
  // 2026-09-20 이전에는 이 필드가 아예 없어서, GPT가 팀명·최종스코어만으로
  // "역전골" 같은 실제로 없었던 장면을 지어내는 사고가 있었다.
  goalsSummary: string
  eventsSummary: string
}

export async function generateMatchStory(input: StoryInput): Promise<string> {
  if (process.env.USE_MOCK_DATA === "true") {
    return `${input.homeTeam}가 ${input.awayTeam}를 상대로 ${input.homeScore}:${input.awayScore}로 승리했습니다. (이 문장은 가짜 데이터 모드에서 보여주는 샘플 스토리입니다.) 실제 배포 시에는 이 자리에 실시간으로 생성된 경기 요약이 표시됩니다.`
  }

  // 먼저 DB 캐시. 있으면 GPT를 아예 호출하지 않는다
  const cached = await getCachedStory(input.matchId)
  if (cached) return cached

  const prompt = `너는 스포츠 전문 기자야. 아래 경기 데이터를 바탕으로, 3문장짜리 흥미로운 경기 요약 스토리를 한국어로 써줘.
과장하지 말고, 데이터에 근거해서 이 경기의 핵심 포인트(승부처, 눈에 띄는 스탯)를 짚어줘.

작성 규칙 (반드시 지켜라):
- 아래 "정확한 득점 기록"에 없는 골, 순서, 스코어, 시점은 절대 지어내지 마라.
  이 표가 유일한 정답이고, 재계산하거나 다르게 서술하면 안 된다.
- 각 골 줄 끝의 [ ] 안에는 그 골이 선제골/동점골/역전골/추가골 중 무엇인지
  이미 계산되어 있다. "역전골"이라는 표현은 오직 [ ] 안에 "역전골"이라고
  명시된 골에만 써라. 그렇지 않은 골에 "역전골"을 갖다 붙이면 심각한 오보다.
  나머지는 표시된 대로 "선제골"/"동점골"/"추가골" 등 표시된 단어만 사용해라.
- 이 경기에 골이 없었다면 "역전"이나 "골"에 관한 어떤 장면도 지어내지 마라.
- ${input.homeTeam}(홈)과 ${input.awayTeam}(원정) 중 어느 팀 골인지는 반드시
  "정확한 득점 기록"에 표시된 팀명을 그대로 따라야 한다. 헷갈리거나 뒤바꿔 쓰지 마라.
- 최종 스코어는 반드시 ${input.homeScore ?? "-"}:${input.awayScore ?? "-"}와 일치해야 한다.

정확한 득점 기록 (그대로 사용, 재계산 금지):
${input.goalsSummary}

리그: ${input.leagueName}
${input.homeTeam} ${input.homeScore ?? "-"} : ${input.awayScore ?? "-"} ${input.awayTeam}
주요 스탯: ${input.statsSummary}
주요 이벤트(참고용): ${input.eventsSummary}

3문장으로만 답해. 다른 설명 없이 스토리 본문만 출력해.`

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 300,
      // 기본값(1.0)은 짧은 3문장 안에서도 스코어/득점 흐름을 "그럴듯하게" 지어내는
      // 경향이 있어서, generateArticle.ts와 동일하게 낮춰서 사실 충실도를 높인다
      // (2026-09-20, "역전골" 오보 사건 이후 추가)
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    }),
    // DB 캐시(위)가 1차 방어선이고, 이건 배포 직후처럼 DB에 아직 없을 때를 위한 2차 방어선.
    cache: "force-cache",
  })

  const data = await res.json()

  if (!res.ok) {
    console.error("OpenAI API 에러:", data)
    return FAILED_MESSAGE
  }

  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) return FAILED_MESSAGE

  // 실패 문구가 캐시에 박히면 영구적으로 그 문구만 보이게 되므로 성공했을 때만 저장
  await saveCachedStory(input.matchId, content)
  return content
}
