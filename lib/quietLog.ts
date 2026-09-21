// (2026-09-21) 로컬 빌드 환경에서는 API-Football이 이 서버의 IP를 차단해서
// getAllTransfers/사이트맵/fetchNewsData 같은 호출이 항상 403/크레딧초과로
// 실패하고, npm run build를 돌릴 때마다 같은 에러 로그가 수십 줄씩 반복
// 출력되는 게 "노이즈"로 느껴졌다. 이 로그들은 Vercel 프로덕션에서는 실제
// 디버깅에 쓰이므로(예: 뉴스 500 에러 원인을 이 로그로 찾았었음) 완전히
// 지우면 안 되고, 로컬에서만 조용히 만든다. Vercel은 VERCEL 환경변수를
// 자동으로 심어주므로 이걸로 로컬/배포 환경을 구분한다.
export function devErrorOrSilent(...args: unknown[]) {
  if (process.env.VERCEL) {
    console.error(...args)
  }
}
