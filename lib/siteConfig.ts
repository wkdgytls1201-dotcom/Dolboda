// 정식 배포 주소. 기본값을 vercel.app으로 두면 환경변수가 빠진 배포에서 canonical·사이트맵·
// OG url이 전부 옛 도메인으로 새어나간다 — 중복 색인의 원인이라 기본값도 정식 도메인으로 둔다.
// (실제 리다이렉트는 next.config.mjs가 담당)
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.dolboda.kr";

export const SITE_NAME = "돌보다";

// 메일 발신 주소 — Resend에서 도메인 인증(SPF·DKIM)을 마치기 전에는 테스트 전용
// onboarding@resend.dev만 쓸 수 있고, 이 주소로는 우리 계정 소유자 외 수신자에게
// 보내면 거부된다. 인증이 끝나면 코드를 고치지 말고 환경변수만 넣으면 된다.
//   MAIL_FROM=noreply@dolboda.kr
export const MAIL_FROM = process.env.MAIL_FROM ?? "onboarding@resend.dev";

// 검색 결과에 그대로 실리는 제목. 사람들이 실제로 치는 말("요양원 찾기")을 앞에 두고
// 브랜드는 뒤로 뺀다 — 아직 브랜드 인지도가 없는 단계에서는 브랜드가 앞에 있으면
// 검색어와 겹치는 부분이 뒤로 밀려 잘린다. 하위 페이지 템플릿("%s | 돌보다")과 형태를 맞췄다.
export const SITE_TITLE = "전국 요양원·요양병원 찾기·비교 | 돌보다";

// 시설 수는 화면에 보이는 실제 집계(2026-08-02 기준 28,834곳)와 어긋나면 안 된다 —
// 카카오톡 공유 카드에 이 문구가 그대로 실려서 "22,000여 개"가 홈 통계와 달라 보였다.
// 정확한 숫자를 박으면 데이터가 늘 때마다 또 어긋나므로 "2만8천여"처럼 자릿수로 쓴다.
export const SITE_DESCRIPTION =
  "국민건강보험공단·건강보험심사평가원 공공데이터로 전국 2만8천여 개 요양원·요양병원·주야간보호센터·방문요양센터의 평가등급, 비급여 비용, 인력 현황을 비교하세요.";

// 공유 카드(카카오톡·문자·SNS) 썸네일. Next.js의 metadata는 하위 페이지가 openGraph를
// 정의하면 루트의 images를 물려받지 않고 통째로 교체한다 — 그래서 시설·지역·가이드 상세를
// 공유하면 썸네일 없는 밋밋한 카드가 나갔다. 각 페이지에서 이 상수를 같이 넣어준다.
export const OG_IMAGE = {
  url: `${SITE_URL}/og.png`,
  width: 1200,
  height: 630,
  alt: SITE_NAME,
} as const;
