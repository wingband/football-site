"use client"

import { Lottie } from "lottie-react"

export default function GoalCelebration() {
  return (
    <div className="w-16 h-16">
      <Lottie
        src="/animations/goal-celebration.json"
        autoplay
        loop
        className="w-full h-full"
      />
    </div>
  )
}