import { NextResponse } from "next/server"
import { getAllArticles } from "@/lib/articles"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const articles = await getAllArticles()
    return NextResponse.json({ articles })
  } catch {
    return NextResponse.json({ articles: [] })
  }
}
