import { redirect } from "next/navigation"

// 사이트 첫 주소(/)에 접속하면 바로 경기 목록 페이지로 이동
export default function Home() {
  redirect("/matches")
}