// 즐겨찾기 섹션에 보여줄 리그 목록을 계산한다.
// 컴포넌트(MatchesExplorer)에서 분리해둔 이유: 이 규칙이 예전에 버그를 만들었던 지점이라
// React 없이 그대로 검증할 수 있게 해두는 편이 안전하다
export type FeaturedLeague = {
  id: number
  displayName: string
  logo: string
  available: boolean
}

export type FixtureLeague = {
  id: number
  name: string
  logo: string
}

export type FavoriteLeagueItem = {
  id: number
  name: string
  logo: string
  noMatchToday: boolean
}

// 주요 리그(featured)를 먼저 넣는 게 핵심.
// 오늘 경기가 없는 리그는 fixtures에 아예 없어서, fixtures만 훑으면
// 즐겨찾기를 눌러도 목록에 나타나지 않는다 (= 리그가 사라져 보이는 버그)
export function deriveFavoriteLeagues(
  featured: FeaturedLeague[],
  fixtureLeagues: FixtureLeague[],
  isFavorite: (leagueId: number) => boolean
): FavoriteLeagueItem[] {
  const seen = new Map<number, FavoriteLeagueItem>()

  for (const f of featured) {
    if (isFavorite(f.id)) {
      seen.set(f.id, {
        id: f.id,
        name: f.displayName,
        logo: f.logo,
        noMatchToday: !f.available,
      })
    }
  }

  // 주요 리그가 아닌 리그(그 외 리그)는 경기 목록에서 이름과 로고를 얻는다
  for (const l of fixtureLeagues) {
    if (isFavorite(l.id) && !seen.has(l.id)) {
      seen.set(l.id, { id: l.id, name: l.name, logo: l.logo, noMatchToday: false })
    }
  }

  return Array.from(seen.values())
}
