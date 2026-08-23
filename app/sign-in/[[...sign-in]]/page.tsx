import { SignIn } from "@clerk/nextjs"
import type { Metadata } from "next"
import { clerkAuthAppearance } from "@/lib/clerkAppearance"

export const metadata: Metadata = {
  title: "로그인",
  description: "GoalLine에 로그인하고 경기 반응, 댓글, 즐겨찾기를 이용하세요.",
  // 인증 페이지는 검색 노출 가치가 없고 중복 색인만 만든다
  robots: { index: false, follow: false },
}

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-pitch-night flex justify-center px-4 py-10 sm:py-16 font-sans">
      <div className="w-full max-w-[26rem]">
        <SignIn
          appearance={clerkAuthAppearance}
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/matches"
        />
      </div>
    </main>
  )
}
