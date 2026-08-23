import { supabase } from '@/lib/supabase'
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

// 채팅은 캐시되면 안 되므로 항상 새로 실행
export const dynamic = 'force-dynamic'

const MAX_LENGTH = 100
const RECENT_LIMIT = 50

// supabase-js는 error를 리턴하는 대신 throw하기도 한다 (잘못된 키, 네트워크 실패 등).
// 그대로 두면 라우트가 JSON이 아닌 500을 뱉어서 클라이언트가 원인을 알 수 없음
function connectionError(err: unknown, where: string) {
  console.error(`[global-chat] ${where} 예외`, err)
  return NextResponse.json(
    { error: 'Supabase 연결 실패 — NEXT_PUBLIC_SUPABASE_URL / ANON_KEY 확인 필요', code: 'CONNECTION' },
    { status: 500 }
  )
}

export async function GET() {
  // 최신 50개를 받아서(내림차순 정렬 + limit) 화면에는 오래된 것부터 보이게 되돌린다.
  // 오름차순 + limit으로 뽑으면 "가장 오래된 50개"가 나와서 최신 대화가 안 보임
  let data, error
  try {
    ;({ data, error } = await supabase
      .from('global_chat')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(RECENT_LIMIT))
  } catch (err) {
    return connectionError(err, 'SELECT')
  }

  if (error) {
    console.error('[global-chat] SELECT 실패', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
  }
  return NextResponse.json((data ?? []).reverse())
}

// 닉네임은 항상 서버에서 만든다 (클라이언트 값을 믿으면 남의 이름으로 글을 쓸 수 있음).
// currentUser()는 Clerk 백엔드 API 호출이라 CLERK_SECRET_KEY가 없거나 Clerk이 죽으면 throw한다.
// 그때 POST 전체가 500이 되면 안 되므로, 실패해도 userId 기반 이름으로 계속 진행
async function resolveNickname(userId: string): Promise<string> {
  try {
    const user = await currentUser()
    const fromProfile =
      user?.username ??
      user?.firstName ??
      user?.emailAddresses[0]?.emailAddress?.split('@')[0]
    if (fromProfile) return fromProfile
  } catch (err) {
    console.error('[global-chat] currentUser() 실패 — userId 기반 닉네임으로 대체', err)
  }
  return `게스트-${userId.slice(-4)}`
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

  const nickname = await resolveNickname(userId)

  let data, error
  try {
    ;({ data, error } = await supabase
      .from('global_chat')
      .insert({ user_id: userId, nickname, content })
      .select()
      .single())
  } catch (err) {
    return connectionError(err, 'INSERT')
  }

  if (error) {
    // Vercel 로그에서 원인을 바로 볼 수 있게 전체를 남긴다.
    // code 42P01 = 테이블 없음(SQL 미실행), 42501 = 권한/RLS 거부
    console.error('[global-chat] INSERT 실패', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      userId,
      nickname,
      contentLength: content.length,
    })
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
  }

  console.log('[global-chat] INSERT 성공', { id: data?.id, userId, nickname })
  return NextResponse.json(data)
}
