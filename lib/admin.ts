import { currentUser } from "@clerk/nextjs/server"

// 칼럼 작성/수정/삭제 같은 운영자 전용 기능의 권한 확인.
// 관리자 이메일은 코드(공개 저장소)에 적지 않고 Vercel 환경변수 ADMIN_EMAILS에
// 쉼표로 구분해서 넣는다. 예: ADMIN_EMAILS=me@gmail.com,other@gmail.com
// 환경변수가 비어 있으면 아무도 관리자가 아니다(안전한 기본값).
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export async function isAdmin(): Promise<boolean> {
  const allowed = adminEmails()
  if (allowed.length === 0) return false
  const user = await currentUser()
  if (!user) return false
  return user.emailAddresses.some(
    (e) => e.verification?.status === "verified" && allowed.includes(e.emailAddress.toLowerCase())
  )
}
