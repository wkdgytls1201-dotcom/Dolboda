// 배포 주소 — 커스텀 도메인 연결 시 NEXT_PUBLIC_SITE_URL 환경변수만 바꾸면 된다.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dolboda-rho.vercel.app";

export const SITE_NAME = "돌보다";

// 메일 발신 주소 — Resend에서 도메인 인증(SPF·DKIM)을 마치기 전에는 테스트 전용
// onboarding@resend.dev만 쓸 수 있고, 이 주소로는 우리 계정 소유자 외 수신자에게
// 보내면 거부된다. 인증이 끝나면 코드를 고치지 말고 환경변수만 넣으면 된다.
//   MAIL_FROM=noreply@dolboda.kr
export const MAIL_FROM = process.env.MAIL_FROM ?? "onboarding@resend.dev";

export const SITE_DESCRIPTION =
  "전국 22,000여 개 요양병원·요양원·주야간보호·방문요양 시설 정보를 평가등급, 비급여 비용, 인력 현황까지 한눈에 비교하는 요양시설 검색 서비스입니다.";
