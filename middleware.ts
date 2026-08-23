import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// 로그인 없이 접근 가능한 페이지 (거의 모든 페이지)
const isPublicRoute = createRouteMatcher([
  "/",
  "/matches(.*)",
  "/leagues(.*)",
  "/teams(.*)",
  "/players(.*)",
  "/news(.*)",
  "/stories(.*)",
  "/transfers(.*)",
  "/standings(.*)",
  "/korean-players(.*)",
  "/best11(.*)",
  "/privacy(.*)",
  "/api/comments(.*)",      // 댓글 읽기는 공개
  "/api/vote(.*)",
  "/api/articles(.*)",
  "/api/korean-abroad(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
}
