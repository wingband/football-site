// 페이지를 넘길 때 서버 응답을 기다리는 동안 바로 보이는 뼈대 화면.
// (이게 없으면 누른 뒤 한참 동안 이전 화면이 그대로 멈춰 있는 것처럼 느껴진다)
export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-pulse" aria-busy="true">
      <div className="h-6 w-40 bg-turf/60" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-turf/40 border border-turf-line/60 rounded-none p-4 sm:p-5 space-y-3">
          <div className="h-4 w-32 bg-turf-line/50" />
          <div className="h-4 w-full bg-turf-line/30" />
          <div className="h-4 w-5/6 bg-turf-line/30" />
          <div className="h-4 w-2/3 bg-turf-line/30" />
        </div>
      ))}
    </div>
  )
}
