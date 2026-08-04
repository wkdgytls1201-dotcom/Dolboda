import { PageLoader } from "@/components/PageLoader";

// 시설찾기 진입 중 화면.
//
// 이게 없으면 본문이 비어 있는 동안 푸터가 화면 위로 올라와, 검색 결과가 뜨기 전에
// "전국 요양병원 · 전국 요양원 …"(푸터의 검색엔진용 링크)이 먼저 보였다. 실제로
// "이게 왜 먼저 뜨냐"는 지적을 받은 자리다. PageLoader가 뷰포트 대부분을 채워
// 푸터를 아래로 밀어낸다.
export default function Loading() {
  return <PageLoader label="시설을 불러오는 중" />;
}
