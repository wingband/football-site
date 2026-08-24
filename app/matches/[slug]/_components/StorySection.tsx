import { generateMatchStory } from "@/lib/generateStory"
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
  const story = await generateMatchStory({
    matchId,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    leagueName,
    statsSummary,
  })

  return (
    <MatchReviewCard
      headline={`${homeTeam} ${homeScore}-${awayScore} ${awayTeam}`}
      summary={story}
      homeLogo={homeLogo}
      awayLogo={awayLogo}
      storySlug={null}
    />
  )
}
