"use client"

import Link from "next/link"
import { useState, type ComponentProps } from "react"

// (2026-10-26) 메뉴용 링크: 마우스를 올리거나(PC) 손가락이 닿는 순간(모바일) 그 페이지 전체를 미리 받아 둔다.
// 대부분의 페이지가 요청할 때마다 새로 만드는 방식이라, 기본 미리받기는 "로딩 화면(회색 틀)"까지만 받아서
// 메뉴를 누르면 회색 화면이 먼저 보였다. 누를 의도가 보일 때만 전체를 받아서 서버 부담은 늘리지 않는다.
// 받아 둔 페이지는 5분간 재사용된다(next.config의 staleTimes.static).
export default function IntentLink(props: ComponentProps<typeof Link>) {
  const [intent, setIntent] = useState(false)
  const { onMouseEnter, onTouchStart, onFocus, ...rest } = props
  return (
    <Link
      {...rest}
      prefetch={intent ? true : false}
      onMouseEnter={(e) => {
        setIntent(true)
        onMouseEnter?.(e)
      }}
      onTouchStart={(e) => {
        setIntent(true)
        onTouchStart?.(e)
      }}
      onFocus={(e) => {
        setIntent(true)
        onFocus?.(e)
      }}
    />
  )
}
