"use client"

import { useState } from "react"
import Image from "next/image"

export default function PlayerAvatar({
  src,
  alt,
  className,
}: {
  src?: string
  alt: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div
        className={`${className} relative flex items-center justify-center bg-turf-line text-floodlight/50 font-data`}
      >
        {alt ? alt.slice(0, 1) : "?"}
      </div>
    )
  }

  return (
    <div className={`${className} relative overflow-hidden`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="80px"
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  )
}
