import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)
const rows = await sql`SELECT LENGTH(content) as len FROM articles`
const lens = rows.map(r => r.len).sort((a, b) => a - b)

const avg = lens.reduce((a, b) => a + b, 0) / lens.length

console.log("총 기사 수:", lens.length)
console.log("평균 길이:", Math.round(avg), "자")
console.log("최소:", lens[0], "자 / 최대:", lens[lens.length - 1], "자")
console.log("중앙값:", lens[Math.floor(lens.length / 2)], "자")
console.log("500자 미만:", lens.filter(l => l < 500).length, "건")
console.log("800자 미만:", lens.filter(l => l < 800).length, "건")
console.log("1200자 이상:", lens.filter(l => l >= 1200).length, "건")
