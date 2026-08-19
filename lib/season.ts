// 리그마다 시즌을 세는 방식이 달라서, 국가를 기준으로 "현재 시즌 연도"를 추정
const CALENDAR_YEAR_COUNTRIES = ["usa", "southkorea", "korearepublic", "japan"]

export function getSeasonYear(country: string, referenceDate = new Date()): number {
  const normalized = country.toLowerCase().replace(/[\s-]/g, "")
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth() + 1

  if (CALENDAR_YEAR_COUNTRIES.includes(normalized)) {
    return year
  }

  return month >= 7 ? year : year - 1
}