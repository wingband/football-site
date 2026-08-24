import { apiFetch } from "@/lib/matchApi"
import type { H2HMatch } from "@/lib/matchApi"
import Section from "@/components/Section"
import H2HPanel from "@/components/H2HPanel"

export default async function H2HSection({
  homeId,
  awayId,
  currentFixtureId,
  homeTeamName,
  awayTeamName,
  homeTeamLogo,
  awayTeamLogo,
}: {
  homeId: number
  awayId: number
  currentFixtureId: number
  homeTeamName: string
  awayTeamName: string
  homeTeamLogo: string
  awayTeamLogo: string
}) {
  const h2h = (await apiFetch(
    `/fixtures/headtohead?h2h=${homeId}-${awayId}&last=20`,
    86400
  )) as H2HMatch[]

  if (!h2h?.length) {
    return (
      <p className="text-floodlight/40 text-sm py-6 text-center">상대전적 정보가 없습니다.</p>
    )
  }

  return (
    <Section title="역대 전적">
      <H2HPanel
        matches={h2h}
        currentFixtureId={currentFixtureId}
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        homeTeamLogo={homeTeamLogo}
        awayTeamLogo={awayTeamLogo}
      />
    </Section>
  )
}
