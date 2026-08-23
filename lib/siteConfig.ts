// 사이트 정규 URL. sitemap / robots / canonical / og:image 절대주소가 모두 이 값을 씁니다.
// NEXT_PUBLIC_* 은 빌드 시점에 값이 박히므로, Vercel에서 환경변수를 바꾸면 재배포해야 반영됩니다.
// 폴백도 실제 도메인으로 둡니다 — 환경변수가 빠지면 잘못된 주소가 사이트맵·canonical에 그대로 나가서
// 색인이 엉키기 때문에, 안전한 기본값은 example.com이 아니라 운영 도메인입니다.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://goalline.me"
