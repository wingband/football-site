import Image from "next/image"

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
  if (!src) return null
  return (
    <span className={`${className} relative inline-block`}>
      <Image src={src} alt={alt} fill sizes="48px" className="object-contain" />
    </span>
  )
}
