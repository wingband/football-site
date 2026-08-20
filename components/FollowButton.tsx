"use client"

import { useState } from "react"

export default function FollowButton() {
  const [following, setFollowing] = useState(false)

  return (
    <button
      onClick={() => setFollowing((f) => !f)}
      className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
        following
          ? "bg-score-amber text-pitch-night"
          : "bg-floodlight text-pitch-night hover:bg-floodlight/80"
      }`}
    >
      {following ? "팔로잉" : "팔로우"}
    </button>
  )
}
