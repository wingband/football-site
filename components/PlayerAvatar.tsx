"use client"

import { useState } from "react"

export default function PlayerAvatar({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-turf-line text-floodlight/50 font-data`}
      >
        {alt ? alt.slice(0, 1) : "?"}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}
