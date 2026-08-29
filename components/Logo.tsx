"use client"

import Image from "next/image"
import { useState } from "react"

// Generic team/league crest renderer backed by next/image (fill pattern).
// Wrap size via className (e.g. "w-5 h-5 shrink-0") exactly like a plain <img> would.
export default function Logo({
  src,
  alt = "",
  className,
}: {
  src?: string | null
  alt?: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null
  return (
    <span className={`${className} relative inline-block`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="48px"
        className="object-contain"
        // API 서버가 일시적으로 로고를 못 줄 때 깨진 아이콘 대신 그냥 안 보이게 처리
        onError={() => setFailed(true)}
      />
    </span>
  )
}
