path = "app/matches/[slug]/page.tsx"
text = open(path, encoding="utf-8").read()

old_import = 'import StorySection from "./_components/StorySection"'
new_import = old_import + '\nimport { buildStatsSummary, buildMatchEventSummaries, type RawMatchEvent } from "@/lib/matchSummaries"'
assert text.count(old_import) == 1
text = text.replace(old_import, new_import)

old_stats = '''  // statsSummary는 fast path의 stats에서 즉시 계산해 StorySection에 prop으로 전달
  const statsSummary =
    stats.length === 2
      ? stats[0].statistics
          .map((s, i) => `${s.type}: ${s.value ?? 0} vs ${stats[1].statistics[i]?.value ?? 0}`)
          .join(", ")
      : "통계 데이터 없음"'''

new_stats = '''  // statsSummary/eventsSummary/goalsSummary는 크론(generate-articles)과 동일한
  // lib/matchSummaries.ts 로직으로 계산한다. StorySection의 3문장 폴백도 똑같이
  // 정확한 골/스코어 흐름 데이터를 받아야 "역전골" 같은 오보를 지어내지 않는다
  // (2026-09-20, 토트넘-아스톤빌라 사건 이후 통합)
  const statsSummary = buildStatsSummary(stats as unknown as { statistics: { type: string; value: unknown }[] }[])
  const { eventsSummary, goalsSummary } = buildMatchEventSummaries(
    events as unknown as RawMatchEvent[],
    match.teams.home.name,
    match.teams.away.name
  )'''

assert text.count(old_stats) == 1
text = text.replace(old_stats, new_stats)

old_props = '''            statsSummary={statsSummary}
            homeLogo={match.teams.home.logo}'''
new_props = '''            statsSummary={statsSummary}
            goalsSummary={goalsSummary}
            eventsSummary={eventsSummary}
            homeLogo={match.teams.home.logo}'''

assert text.count(old_props) == 1
text = text.replace(old_props, new_props)

open(path, "w", encoding="utf-8").write(text)
print("page.tsx 패치 완료")
