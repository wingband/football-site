import { getMatchNews } from "@/lib/matchApi"
import Section from "@/components/Section"
import MatchNewsCard from "@/components/MatchNewsCard"

export default async function NewsSection({
  homeTeam,
  awayTeam,
}: {
  homeTeam: string
  awayTeam: string
}) {
  const articles = await getMatchNews(homeTeam, awayTeam)
  return (
    <Section title="뉴스">
      <MatchNewsCard articles={articles} />
    </Section>
  )
}
