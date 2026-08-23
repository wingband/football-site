import { getCachedStory, saveCachedStory } from "@/lib/storyCache"

const FAILED_MESSAGE = "스토리를 생성하지 못했습니다."

type StoryInput = {
  // 리뷰 캐시 키. 종료된 경기의 리뷰는 다시 바뀌지 않는다
  matchId: number
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  leagueName: string
  statsSummary: string
}

export async function generateMatchStory(input: StoryInput): Promise<string> {
  if (process.env.USE_MOCK_DATA === "true") {
    return `${input.homeTeam}가 ${input.awayTeam}를 상대로 ${input.homeScore}:${input.awayScore}로 승리했습니다. (이 문장은 가짜 데이터 모드에서 보여주는 샘플 스토리입니다.) 실제 배포 시에는 이 자리에 AI가 실시간으로 생성한 경기 요약이 표시됩니다.`
  }

  // 먼저 DB 캐시. 있으면 GPT를 아예 호출하지 않는다
  const cached = await getCachedStory(input.matchId)
  if (cached) return cached

  const prompt = `너는 스포츠 전문 기자야. 아래 경기 데이터를 바탕으로, 3문장짜리 흥미로운 경기 요약 스토리를 한국어로 써줘.
과장하지 말고, 데이터에 근거해서 이 경기의 핵심 포인트(승부처, 눈에 띄는 스탯)를 짚어줘.

리그: ${input.leagueName}
${input.homeTeam} ${input.homeScore ?? "-"} : ${input.awayScore ?? "-"} ${input.awayTeam}
주요 스탯: ${input.statsSummary}

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
      messages: [{ role: "user", content: prompt }],
    }),
    // DB 캐시(위)가 1차 방어선이고, 이건 배포 직후처럼 DB에 아직 없을 때를 위한 2차 방어선.
    // force-cache는 POST도 캐시하지만 캐시 키에 요청 본문이 들어가고 배포 시 비워진다
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