// 돌봄 포인트 — 금액·상품 정의(클라이언트·서버 공용, 순수 상수).
// 경제 설계의 근거와 법적 장치는 docs/points-spec.md가 단일 진실 공급원이다.
// ⚠️ 값을 바꾸면 그 문서의 표와 변경 이력을 반드시 함께 갱신할 것.

// 단위 감각: 국내 포인트 관행(1P≈1원 멘탈모델)에 맞춰 큰 단위를 쓴다(2026-08-05
// 사용자 결정 — "400P는 쿠폰 체감이 안 난다"). 비율은 유지: 리본 = 잘한 돌봄 2~3건.
export const POINT_EARN = {
  /** 매니저 — 완료한 돌봄에 보호자 후기가 도착했을 때 */
  reviewReceived: 1000,
  /** 매니저 — 그 후기가 5점 만점일 때 추가 */
  fiveStarBonus: 500,
  /** 매니저 — 돌봄일지에 보호자 원탭 반응(🙏😊💪)을 받았을 때(기록 1건당) */
  reactionPerLog: 50,
  /** 반응 적립의 요청당 상한(= 10회) — 반응은 감사의 표시이지 채굴 대상이 아니다 */
  reactionCapPerRequest: 10,
  /** 보호자 — 완료한 돌봄에 후기를 남겼을 때 */
  reviewWritten: 500,
  /** 추천인 — 내가 초대한 사람이 가입(귀속)했을 때 */
  referralReferrer: 2000,
  /** 초대받은 사람 — 초대 링크로 가입(귀속)했을 때 */
  referralReferee: 1000,
} as const;

/** 추천 귀속 가능 기간(가입 후 일수) — 기존 회원끼리 코드를 주고받는 어뷰징 차단 */
export const REFERRAL_CLAIM_WINDOW_DAYS = 14;

export const POINT_SPEND = {
  ribbon: {
    price: 5000,
    days: 7,
    label: "돌봄 스타 별",
    desc: "7일간 지원자 카드와 공개 프로필에 ⭐ 별이 달리고, 지원자 목록에서 더 위에 보여요.",
  },
  requestBoost: {
    price: 2000,
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
  spend_ribbon: "돌봄 스타 별 사용",
  spend_request_boost: "우선 요청 사용",
  referral_referrer: "친구 초대 보상",
  referral_referee: "초대받고 가입",
  admin_grant: "돌보다 지급",
};

/** 포인트 유효기간(개월) — 약관·화면 고지와 같은 값
 *
 * ⚠️ **아직 잔액 계산에 반영되지 않는다**(2026-08-06 감사에서 확인). `getPointBalance()`는
 *    원장 전체를 합산하고 소멸 처리가 없다 — 즉 화면·약관은 "24개월 뒤 사라진다"고 하는데
 *    실제로는 사라지지 않는다. 지금은 사용자에게 유리한 방향이라 피해가 없지만,
 *    첫 소멸 대상이 생기기 전에 정하고 구현해야 한다(소멸은 사용자에게 불리한 변경이라
 *    docs/points-spec.md §1 절차대로 사용자 확인이 필요하다). */
export const POINT_EXPIRY_MONTHS = 24;

/**
 * `User.createdAt`이 이 날짜인 계정은 **실제 가입일을 모르는 기존 회원**이다.
 *
 * 이 필드는 2026-08-05에 추가됐고, 그때 이미 있던 회원 전원에게 `default(now())`로
 * 그날 날짜가 찍혔다(스키마 주석 참조). 그래서 "가입 N일 이내만 초대를 등록할 수 있다"는
 * 추천 보상 가드가 **기존 회원 전원에게 통과**돼 버렸다 — 2026-08-06 감사 실측:
 * 회원 15명 전원이 이 날짜라 전원이 "신규"로 판정됐다. 기존 회원끼리 코드를 주고받아
 * 보상을 캐는 것을 막으려던 장치가 정확히 반대로 작동하고 있었다.
 *
 * 이 날짜에 실제로 가입한 사람도 함께 막히지만, 지급을 잘못 내주는 쪽보다 안전하다.
 */
export const USER_CREATED_AT_BACKFILL_DATE = "2026-08-05";
