// "2026-08-17" 같은 YYYY-MM-DD 문자열을 다루는 유틸 함수들

export function toDateStr(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
  
  export function getTodayStr(): string {
    return toDateStr(new Date())
  }
  
  // 기준 날짜(centerDateStr)를 가운데 두고, 앞뒤로 offset일씩 총 (offset*2+1)개의 날짜 문자열 배열을 반환
  export function getDateRange(centerDateStr: string, offset: number): string[] {
    const center = new Date(centerDateStr + "T00:00:00")
    const result: string[] = []
    for (let i = -offset; i <= offset; i++) {
      const d = new Date(center)
      d.setDate(d.getDate() + i)
      result.push(toDateStr(d))
    }
    return result
  }
  
  const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"]
  
  // 날짜 탭에 표시할 짧은 라벨. 오늘/어제/내일은 특별 표기, 나머지는 "8/15 (토)" 형식
  export function formatDateLabel(dateStr: string, todayStr: string): string {
    if (dateStr === todayStr) return "오늘"
  
    const diffDays = Math.round(
      (new Date(dateStr + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime()) /
        (1000 * 60 * 60 * 24)
    )
    if (diffDays === -1) return "어제"
    if (diffDays === 1) return "내일"
  
    const d = new Date(dateStr + "T00:00:00")
    return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS_KO[d.getDay()]})`
  }

  export function shiftDate(dateStr: string, n: number): string {
    const d = new Date(dateStr + "T00:00:00")
    d.setDate(d.getDate() + n)
    return toDateStr(d)
  }



  // 달력 팝업에 쓸 "한 달치 6주(42칸)" 그리드를 만듦.
// 그 달이 아닌 날짜(앞/뒤 달 채우기 용)는 inMonth: false로 표시
export function getMonthGrid(year: number, month: number): { dateStr: string; inMonth: boolean }[] {
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = firstOfMonth.getDay() // 0(일)~6(토)

  const gridStart = new Date(year, month, 1 - startWeekday)

  const cells: { dateStr: string; inMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    cells.push({ dateStr: toDateStr(d), inMonth: d.getMonth() === month })
  }
  return cells
}