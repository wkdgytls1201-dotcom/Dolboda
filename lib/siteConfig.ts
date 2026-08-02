// 배포 주소 — 커스텀 도메인 연결 시 NEXT_PUBLIC_SITE_URL 환경변수만 바꾸면 된다.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dolboda-rho.vercel.app";

export const SITE_NAME = "돌보다";

// 메일 발신 주소 — Resend에서 도메인 인증(SPF·DKIM)을 마치기 전에는 테스트 전용
// onboarding@resend.dev만 쓸 수 있고, 이 주소로는 우리 계정 소유자 외 수신자에게
// 보내면 거부된다. 인증이 끝나면 코드를 고치지 말고 환경변수만 넣으면 된다.
//   MAIL_FROM=noreply@dolboda.kr
export const MAIL_FROM = process.env.MAIL_FROM ?? "onboarding@resend.dev";

// 시설 수는 화면에 보이는 실제 집계(2026-08-02 기준 28,834곳)와 어긋나면 안 된다 —
// 카카오톡 공유 카드에 이 문구가 그대로 실려서 "22,000여 개"가 홈 통계와 달라 보였다.
export const SITE_DESCRIPTION =
  "전국 28,000여 개 요양병원·요양원·주야간보호·방문요양 시설 정보를 평가등급, 비급여 비용, 인력 현황까지 한눈에 비교하는 요양시설 검색 서비스입니다.";

// 공유 카드(카카오톡·문자·SNS) 썸네일. Next.js의 metadata는 하위 페이지가 openGraph를
// 정의하면 루트의 images를 물려받지 않고 통째로 교체한다 — 그래서 시설·지역·가이드 상세를
// 공유하면 썸네일 없는 밋밋한 카드가 나갔다. 각 페이지에서 이 상수를 같이 넣어준다.
export const OG_IMAGE = {
  url: `${SITE_URL}/og.png`,
  width: 1200,
  height: 630,
  alt: SITE_NAME,
} as const;
