// 사이트 정규 URL. sitemap / robots / canonical / og:image 절대주소가 모두 이 값을 씁니다.
// NEXT_PUBLIC_* 은 빌드 시점에 값이 박히므로, Vercel에서 환경변수를 바꾸면 재배포해야 반영됩니다.
// 폴백도 실제 도메인으로 둡니다 — 환경변수가 빠지면 잘못된 주소가 사이트맵·canonical에 그대로 나가서
// 색인이 엉키기 때문에, 안전한 기본값은 example.com이 아니라 운영 도메인입니다.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://goalline.me"

// (2026-10-17) 광고 전체 켜기/끄기 스위치. false면 카카오 애드핏(상단 배너·스크립트), 쿠팡 파트너스 배너,
// 빈 광고 자리(AdSlot)가 모두 화면에서 빠진다. 다시 켜려면 true로 바꾸고 배포하면 된다.
// ads.txt(애드센스 인증 파일)는 이 스위치와 무관하게 그대로 둔다.
export const ADS_ENABLED = false
