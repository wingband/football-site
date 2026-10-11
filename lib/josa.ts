// 한글 조사: 마지막 글자에 받침이 있으면 a, 없으면 b ("손흥민이", "이강인이", "정우영이" / "황희찬이"… "김민재가")
export function withJosa(word: string, a: string, b: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  if (code < 0 || code > 11171) return `${word}${a}(${b})`
  return `${word}${code % 28 ? a : b}`
}
