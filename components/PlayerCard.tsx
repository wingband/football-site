type PlayerCardProps = {
    name: string
    position: string
    team: string
    photoUrl: string
    stats: {
      label: string
      value: number
      max: number
    }[]
  }
  
  export default function PlayerCard({ name, position, team, photoUrl, stats }: PlayerCardProps) {
    return (
      <div className="max-w-sm rounded-2xl overflow-hidden shadow-lg bg-white border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
        {/* 상단: 선수 사진 영역 */}
        <div className="relative bg-gradient-to-br from-green-600 to-green-800 p-6 flex flex-col items-center">
          <img
            src={photoUrl}
            alt={name}
            className="w-24 h-24 rounded-full border-4 border-white object-cover"
          />
          <h2 className="text-white text-xl font-bold mt-3">{name}</h2>
          <p className="text-green-100 text-sm">{position} · {team}</p>
        </div>
  
        {/* 하단: 스탯 바 (전력분석 애니메이션의 가장 단순한 버전) */}
        <div className="p-5 space-y-3">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{stat.label}</span>
                <span className="font-semibold">{stat.value}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-green-600 h-2.5 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${(stat.value / stat.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }