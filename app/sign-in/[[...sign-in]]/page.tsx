import { SignIn } from "@clerk/nextjs"

// Google 등 OAuth 로그인은 팝업 모달만으로는 완결되지 않고, 인증 후
// 리다이렉트되는 /sign-in#/sso-callback 경로에서 Clerk의 컴포넌트가
// 실제로 마운트되어 있어야 로그인이 마무리된다. 이 페이지가 없으면
// OAuth 콜백이 404로 떨어진다 (2026-09-21, Google 로그인 연동 중 발견).
export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-pitch-night">
      <SignIn />
    </div>
  )
}
