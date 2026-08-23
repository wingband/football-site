import { supabase } from '@/lib/supabase'
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

// 채팅은 캐시되면 안 되므로 항상 새로 실행
export const dynamic = 'force-dynamic'

const MAX_LENGTH = 100
const RECENT_LIMIT = 50

export async function GET() {
  // 최신 50개를 받아서(내림차순 정렬 + limit) 화면에는 오래된 것부터 보이게 되돌린다.
  // 오름차순 + limit으로 뽑으면 "가장 오래된 50개"가 나와서 최신 대화가 안 보임
  const { data, error } = await supabase
    .from('global_chat')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(RECENT_LIMIT)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((data ?? []).reverse())
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  let body: { content?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const content = typeof body.content === 'string' ? body.content.trim() : ''
  if (!content) {
    return NextResponse.json({ error: '내용을 입력해주세요' }, { status: 400 })
  }
  if (content.length > MAX_LENGTH) {
    return NextResponse.json({ error: `${MAX_LENGTH}자 이내로 작성해주세요` }, { status: 400 })
  }

  // user_id / nickname은 세션에서 직접 만든다.
  // 클라이언트가 보낸 값을 그대로 쓰면 남의 닉네임으로 글을 쓸 수 있음
  const user = await currentUser()
  const nickname =
    user?.username ??
    user?.firstName ??
    user?.emailAddresses[0]?.emailAddress?.split('@')[0] ??
    '익명'

  const { data, error } = await supabase
    .from('global_chat')
    .insert({ user_id: userId, nickname, content })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
