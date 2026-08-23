import { SignUp } from "@clerk/nextjs"
import type { Metadata } from "next"
import { clerkAuthAppearance } from "@/lib/clerkAppearance"

export const metadata: Metadata = {
  title: "회원가입",
  description: "GoalLine 회원가입하고 경기 반응 투표, 댓글, 리그 즐겨찾기를 이용하세요.",
  robots: { index: false, follow: false },
}

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-pitch-night flex justify-center px-4 py-10 sm:py-16 font-sans">
      <div className="w-full max-w-[26rem]">
        <SignUp
          appearance={clerkAuthAppearance}
          signInUrl="/sign-in"
          fallbackRedirectUrl="/matches"
        />
      </div>
    </main>
  )
}
