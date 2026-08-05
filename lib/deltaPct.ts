/**
 * 이전 구간 대비 증감률(%). 순수 함수라 서버·클라이언트 어디서든 안전하게 쓴다
 * (기업회원 콘솔의 실시간 배지, 월간 성과 보고서 둘 다 이 계산을 그대로 쓴다 —
 * 예전엔 각자 따로 구현하고 있었다).
 *
 * previous가 0이면 "몇 % 늘었다"가 분모 0이라 의미가 없다 — null을 돌려주고,
 * 화면은 null을 "신규" 또는 "지난 구간 데이터 없음"처럼 그 맥락에 맞게 보여준다.
 */
export function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
