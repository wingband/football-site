import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { isAdmin } from "@/lib/admin"
import { listPlayerNames } from "@/lib/playerNameKo"
import NameRow from "./NameRow"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "선수 이름 표기", robots: { index: false, follow: false } }

// 관리자 전용: AI가 바꾼 선수 한글 표기를 확인·수정. 고치면 다음 초안부터 반영된다.
export default async function PlayerNamesPage() {
  if (!(await isAdmin())) notFound()
  const rows = await listPlayerNames()
  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-16">
        <h1 className="text-xl font-bold text-floodlight mb-1">선수 이름 한글 표기</h1>
        <p className="text-xs text-floodlight/50 mb-6">
          칼럼 초안에 쓰이는 표기예요. 틀린 걸 고치고 저장하면 다음 초안부터 반영돼요. (이미 만든 초안은 &quot;초안 다시 만들기&quot;)
        </p>
        {rows.length === 0 ? (
          <p className="text-sm text-floodlight/40">아직 저장된 이름이 없어요.</p>
        ) : (
          <ul className="divide-y divide-turf-line/40">
            {rows.map((r) => (
              <NameRow key={r.name} name={r.name} ko={r.ko} />
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
