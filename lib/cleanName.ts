// API 데이터가 가끔 "L. AbubakarL. Abubakar"처럼 이름을 중복으로 내려줄 때가 있어서
// 앞뒤 절반이 완전히 똑같으면 절반만 남기는 안전장치
export function cleanName(name: string): string {
    const len = name.length
    if (len % 2 === 0) {
      const half = len / 2
      if (name.slice(0, half) === name.slice(half)) {
        return name.slice(0, half)
      }
    }
    return name
  }