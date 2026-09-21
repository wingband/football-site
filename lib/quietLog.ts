// (2026-09-21) 로컬 빌드 환경에서는 API-Football이 이 서버의 IP를 차단해서
// getAllTransfers/사이트맵/fetchNewsData 같은 호출이 항상 403/크레딧초과로
// 실패하고, npm run build를 돌릴 때마다 같은 에러 로그가 수십 줄씩 반복
// 출력되는 게 "노이즈"로 느껴졌다. 이 로그들은 Vercel 프로덕션에서는 실제
// 디버깅에 쓰이므로(예: 뉴스 500 에러 원인을 이 로그로 찾았었음) 완전히
// 지우면 안 되고, 로컬에서만 조용히 만든다.
//
// 처음엔 Vercel이 자동으로 심어주는 VERCEL 환경변수로 구분하려 했으나,
// `vercel env pull`로 .env.local을 동기화할 때 VERCEL="1", VERCEL_ENV=
// "production" 같은 Vercel 자체 시스템 변수까지 그대로 로컬 파일에 박혀버려서
// 로컬 서버가 스스로를 Vercel이라고 착각하는 문제가 있었다(2026-09-21 발견).
// .env.local이 다시 pull될 때마다 재발할 수 있으므로, Vercel 변수에 기대지
// 않고 우리가 직접 지정하는 IS_LOCAL_BUILD로 판단한다 — 이 변수는
// .env.local에만 두고 Vercel 프로젝트 환경변수에는 절대 넣지 않는다.
export function devErrorOrSilent(...args: unknown[]) {
  if (process.env.IS_LOCAL_BUILD !== "true") {
    console.error(...args)
  }
}
