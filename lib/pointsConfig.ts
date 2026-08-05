// 돌봄 포인트 — 금액·상품 정의(클라이언트·서버 공용, 순수 상수).
// 경제 설계의 근거와 법적 장치는 docs/points-spec.md가 단일 진실 공급원이다.
// ⚠️ 값을 바꾸면 그 문서의 표와 변경 이력을 반드시 함께 갱신할 것.

export const POINT_EARN = {
  /** 매니저 — 완료한 돌봄에 보호자 후기가 도착했을 때 */
  reviewReceived: 100,
  /** 매니저 — 그 후기가 5점 만점일 때 추가 */
  fiveStarBonus: 30,
  /** 매니저 — 돌봄일지에 보호자 원탭 반응(🙏😊💪)을 받았을 때(기록 1건당) */
  reactionPerLog: 5,
  /** 반응 적립의 요청당 상한(= 10회) — 반응은 감사의 표시이지 채굴 대상이 아니다 */
  reactionCapPerRequest: 10,
  /** 보호자 — 완료한 돌봄에 후기를 남겼을 때 */
  reviewWritten: 50,
} as const;

export const POINT_SPEND = {
  ribbon: {
    price: 400,
    days: 7,
    label: "돌봄 스타 리본",
    desc: "지원자 카드와 공개 프로필에 7일간 ⭐ 리본이 달려요. 순서는 그대로, 눈에 띄는 정도만 달라져요.",
  },
  requestBoost: {
    price: 300,
    days: 7,
    label: "우선 요청",
    desc: "내 돌봄 요청이 7일간 매니저 일자리 목록 상단에 고정되고 배지가 붙어요.",
  },
} as const;

/** 원장 kind → 사람이 읽는 내역 문구 */
export const POINT_KIND_LABEL: Record<string, string> = {
  review_received: "보호자 후기 도착",
  review_five_star: "후기 5점 보너스",
  reaction: "보호자 반응 받음",
  review_written: "후기 작성",
  spend_ribbon: "돌봄 스타 리본 사용",
  spend_request_boost: "우선 요청 사용",
};

/** 포인트 유효기간(개월) — 약관·화면 고지와 같은 값 */
export const POINT_EXPIRY_MONTHS = 24;
