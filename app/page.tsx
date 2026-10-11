import { permanentRedirect } from "next/navigation"

// 사이트 첫 주소(/)에 접속하면 바로 경기 목록 페이지로 이동
export default function Home() {
  // 308 영구 이동 — 임시 이동(307)이면 구글이 / 와 /matches를 둘 다 들고 있어 중복으로 본다
  permanentRedirect("/matches")
}