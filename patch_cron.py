path = "app/api/cron/generate-articles/route.ts"
text = open(path, encoding="utf-8").read()

old_import = 'import { generateMatchArticle } from "@/lib/generateArticle"'
new_import = old_import + '\nimport { buildStatsSummary, buildMatchEventSummaries, type RawMatchEvent } from "@/lib/matchSummaries"'
assert text.count(old_import) == 1
text = text.replace(old_import, new_import)

old_block = '''    let statsSummary = "통계 데이터 없음"
    let eventsSummary = "이벤트 데이터 없음"
    let goalsSummary = "골 데이터 없음"
    let playerTags: string[] = []

    if (process.env.USE_MOCK_DATA !== "true") {
      const stats = await apiFetch(`/fixtures/statistics?fixture=${match.fixture.id}`)
      if (stats?.length === 2) {
        statsSummary = stats[0].statistics
          .map((s: { type: string; value: unknown }, i: number) =>
            `${s.type}: ${s.value ?? 0} vs ${stats[1].statistics[i]?.value ?? 0}`
          )
          .join(", ")
      }

      const events = await apiFetch(`/fixtures/events?fixture=${match.fixture.id}`) as
        | {
            time: { elapsed: number }
            type: string
            team: { name: string }
            player: { name: string }
            assist: { name: string | null }
          }[]
        | undefined

      if (events?.length) {
        // GPT가 "49분"을 스스로 전/후반으로 환산하다가 자꾸 틀려서(예: 후반 30분으로 착각),
        // 여기서 미리 "후반 4분"처럼 계산해서 넘겨준다
        const formatHalfMinute = (elapsed: number) =>
          elapsed <= 45 ? `전반 ${elapsed}분` : `후반 ${elapsed - 45}분`

        // 어느 팀 소속인지를 안 알려주면 GPT가 홈/원정을 헷갈려서 골을 반대 팀에 붙이는
        // 경우가 있었다. 팀명과 그 시점의 스코어까지 미리 계산해서 넘겨준다
        let homeGoals = 0
        let awayGoals = 0
        // "전반에만 N골을 몰아넣으며" 같은 요약 문장을 쓰다가, 상대팀이 그 전반에
        // 넣은 골까지 우리 팀 걸로 합산해버리는 사례가 있었다. 전/후반 팀별 득점
        // 개수를 미리 계산해서 요약 문장의 숫자를 검증할 수 있게 한다
        let homeFirstHalfGoals = 0
        let awayFirstHalfGoals = 0
        let homeSecondHalfGoals = 0
        let awaySecondHalfGoals = 0
        const goalLines: string[] = []
        eventsSummary = events
          .map((e) => {
            let scoreLabel = ""
            if (e.type === "Goal") {
              const isHome = e.team.name === match.teams.home.name
              if (isHome) homeGoals++
              else if (e.team.name === match.teams.away.name) awayGoals++
              if (e.time.elapsed <= 45) {
                if (isHome) homeFirstHalfGoals++
                else awayFirstHalfGoals++
              } else {
                if (isHome) homeSecondHalfGoals++
                else awaySecondHalfGoals++
              }
              scoreLabel = ` (스코어 ${homeGoals}-${awayGoals})`
              goalLines.push(
                `${goalLines.length + 1}번째 골 — ${formatHalfMinute(e.time.elapsed)} [${e.team.name}] ${e.player.name}` +
                  (e.assist?.name ? ` (도움: ${e.assist.name})` : "") +
                  ` → 스코어 ${homeGoals}-${awayGoals}`
              )
            }
            return `${formatHalfMinute(e.time.elapsed)}(전체 ${e.time.elapsed}분) [${e.team.name}] ${e.type} - ${e.player.name}${scoreLabel}`
          })
          .join(", ")

        // 골만 따로, 시간순으로 번호를 매겨 명확하게 분리해서 넘긴다.
        // 카드/교체 이벤트들 사이에 골이 묻히면 GPT가 득점 순서·소속팀·스코어를
        // 잘못 재구성하는 경우가 많아서, 가장 중요한 사실만 별도 블록으로 뺀다
        goalsSummary = goalLines.length ? goalLines.join("\\n") : "이 경기에는 골이 없었다"
        goalsSummary +=
          `\\n\\n[전/후반 팀별 득점 개수 — "전반에 N골" 같은 요약 문장을 쓸 때 이 숫자와 반드시 일치해야 함]\\n` +
          `${match.teams.home.name} 전반 ${homeFirstHalfGoals}골, 후반 ${homeSecondHalfGoals}골\\n` +
          `${match.teams.away.name} 전반 ${awayFirstHalfGoals}골, 후반 ${awaySecondHalfGoals}골`

        // 태그용: 득점/어시스트 선수를 먼저, 그다음 카드 받은 선수를 등장 순서대로
        // 중복 없이 모은다 (태그 개수를 늘리기 위해 카드도 포함)
        const seen = new Set<string>()
        const cardTags: string[] = []
        for (const e of events) {
          if (e.type === "Goal") {
            if (e.player.name && !seen.has(e.player.name)) {
              seen.add(e.player.name)
              playerTags.push(e.player.name)
            }
            if (e.assist?.name && !seen.has(e.assist.name)) {
              seen.add(e.assist.name)
              playerTags.push(e.assist.name)
            }
          } else if (e.type === "Card") {
            if (e.player.name && !seen.has(e.player.name)) {
              seen.add(e.player.name)
              cardTags.push(e.player.name)
            }
          }
        }
        playerTags = [...playerTags, ...cardTags].slice(0, 12)
      }
    }'''

new_block = '''    let statsSummary = "통계 데이터 없음"
    let eventsSummary = "이벤트 데이터 없음"
    let goalsSummary = "골 데이터 없음"
    let playerTags: string[] = []

    if (process.env.USE_MOCK_DATA !== "true") {
      const stats = await apiFetch(`/fixtures/statistics?fixture=${match.fixture.id}`)
      statsSummary = buildStatsSummary(stats)

      const events = (await apiFetch(`/fixtures/events?fixture=${match.fixture.id}`)) as
        | RawMatchEvent[]
        | undefined

      const summaries = buildMatchEventSummaries(events, match.teams.home.name, match.teams.away.name)
      eventsSummary = summaries.eventsSummary
      goalsSummary = summaries.goalsSummary
      playerTags = summaries.playerTags
    }'''

assert text.count(old_block) == 1
text = text.replace(old_block, new_block)

open(path, "w", encoding="utf-8").write(text)
print("cron route.ts 패치 완료")
