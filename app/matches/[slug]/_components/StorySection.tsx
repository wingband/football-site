import { generateMatchStory } from "@/lib/generateStory"
import { getArticleByMatchId } from "@/lib/articles"
import MatchReviewCard from "@/components/MatchReviewCard"

export default async function StorySection({
  matchId,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  leagueName,
  statsSummary,
  homeLogo,
  awayLogo,
}: {
  matchId: number
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  leagueName: string
  statsSummary: string
  homeLogo: string
  awayLogo: string
}) {
  // 크론이 이미 300~500단어 리뷰를 만들어뒀으면 그걸 그대로 쓰고,
  // 없을 때만(대상 리그가 아니거나 아직 생성 전) 간단한 3문장 요약으로 대체한다
  const fullArticle = await getArticleByMatchId(matchId)

  const summary = fullArticle
    ? fullArticle.content
    : await generateMatchStory({
        matchId,
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        leagueName,
        statsSummary,
      })

  // 팀명·리그명은 항상 태그로 붙이고, 득점/어시스트 선수 태그는 기사가 있을 때만 추가된다
  const tags = [homeTeam, awayTeam, leagueName, ...(fullArticle?.playerTags ?? [])]

  return (
    <MatchReviewCard
      headline={`${homeTeam} ${homeScore}-${awayScore} ${awayTeam}`}
      summary={summary}
      homeLogo={homeLogo}
      awayLogo={awayLogo}
      storySlug={null}
      tags={tags}
    />
  )
}
