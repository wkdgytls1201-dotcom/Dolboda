/**
 * 계좌번호 마스킹 — 뒤 4자리만 남긴다.
 *
 * 본인 화면이라도 전체를 그대로 띄우면 어깨너머·공용 기기·화면 공유에서 그대로 새어나간다.
 * 금융권 표준대로 마지막 4자리만 남기고, 본인은 그것만으로 자기 계좌인지 알아볼 수 있다.
 * (수정이 필요하면 "수정" 버튼으로 새로 입력한다 — 마스킹된 값을 되돌려 보여줄 일은 없다)
 */
export function maskAccount(account: string | null | undefined): string {
  if (!account) return "";
  const digits = account.replace(/\D/g, "");
  if (digits.length <= 4) return account;
  return `${"*".repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`;
}
