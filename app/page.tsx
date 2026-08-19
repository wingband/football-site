import PlayerCard from "@/components/PlayerCard"

export default function Home() {
  // 지금은 하드코딩된 예시 데이터.
  // 다음 단계에서 이 부분이 API-Football fetch 결과로 바뀝니다.
  const playerData = {
    name: "김민재",
    position: "센터백",
    team: "바이에른 뮌헨",
    photoUrl: "https://placehold.co/200x200/1f8f4e/ffffff?text=KMJ",
    stats: [
      { label: "태클 성공률", value: 78, max: 100 },
      { label: "공중볼 경합 승률", value: 85, max: 100 },
      { label: "패스 정확도", value: 91, max: 100 },
      { label: "인터셉트", value: 62, max: 100 },
    ],
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <PlayerCard {...playerData} />
    </main>
  )
}