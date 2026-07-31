// Unsplash 무료 라이선스 사진(인물 없는 건물/정원 컷만 선별).
// 실제 시설 사진이 아닌 예시 이미지이며, 상세페이지에는 "예시 이미지" 배지로 명시한다.
// 전부 가로형(landscape)이어야 한다 — 세로형 사진을 넣으면 카드·배너의 가로 비율 박스에
// object-cover로 강제로 채우면서 대부분이 잘려나간다(photo-1521386787102...가 800x1200
// 세로 사진이라 모바일 히어로 배너에서 심하게 잘리는 문제가 있어 제외했다).
export const FACILITY_PHOTOS = [
  "https://images.unsplash.com/photo-1586773860418-d37222d8fce3",
  "https://images.unsplash.com/photo-1574958269340-fa927503f3dd",
  "https://images.unsplash.com/photo-1626315869436-d6781ba69d6e",
  "https://images.unsplash.com/photo-1782743274169-90b67407f865",
] as const;

export function facilityPhotoFor(id: string, width = 800): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const base = FACILITY_PHOTOS[hash % FACILITY_PHOTOS.length];
  return `${base}?w=${width}&q=80&auto=format&fit=crop`;
}
