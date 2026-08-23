import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get('matchId')
  if (!matchId) return NextResponse.json([])

  const { data, error } = await supabase
    .from('match_comments')
    .select('*')
    .eq('match_id', parseInt(matchId))
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { matchId, userId, nickname, content } = body

  const { data, error } = await supabase
    .from('match_comments')
    .insert({ match_id: matchId, user_id: userId, nickname, content })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}