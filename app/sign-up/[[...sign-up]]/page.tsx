import { SignUp } from "@clerk/nextjs"

// /sign-in과 동일한 이유로 필요 (OAuth 콜백 완결용).
export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-pitch-night">
      <SignUp />
    </div>
  )
}
