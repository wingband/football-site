"use client"

import { useState, useEffect } from "react"
import { useUser, SignInButton } from "@clerk/nextjs"

export default function LikeButton({ postId, initialCount }: { postId: number; initialCount: number }) {
  const { isSignedIn } = useUser()
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!isSignedIn) {
      setLoaded(true)
      return
    }
    fetch(`/api/board/${postId}/like`)
      .then((r) => r.json())
      .then((data) => {
        setLiked(data.liked)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [postId, isSignedIn])

  async function handleLike() {
    if (liked) return
    const res = await fetch(`/api/board/${postId}/like`, { method: "POST" })
    if (res.ok) {
      const data = await res.json()
      if (data.succeeded) {
        setLiked(true)
        setCount((c) => c + 1)
      }
    }
  }

  if (!loaded) return null

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button className="flex items-center gap-1.5 text-xs px-4 py-2 border border-turf-line rounded text-floodlight/50 hover:text-floodlight transition-colors">
          👍 추천 {count > 0 ? count : ""}
        </button>
      </SignInButton>
    )
  }

  return (
    <button
      onClick={handleLike}
      disabled={liked}
      className={`flex items-center gap-1.5 text-xs px-4 py-2 rounded transition-colors ${
        liked
          ? "bg-score-amber/20 text-score-amber border border-score-amber/40"
          : "border border-turf-line text-floodlight/60 hover:text-score-amber hover:border-score-amber/40"
      }`}
    >
      👍 추천 {count > 0 ? count : ""}
    </button>
  )
}
