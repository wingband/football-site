import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

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
  "/sitemap.xml",
  "/robots.txt",
  "/api/comments(.*)",
  "/api/global-chat(.*)",
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
