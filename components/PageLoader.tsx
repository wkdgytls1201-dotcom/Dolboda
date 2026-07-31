// 화면 전환·데이터를 불러오는 동안 보여주는 가벼운 로더. 직접 그린 모양 대신 실제
// 로고 이미지(public/logo.png, 헤더에서 이미 로드돼 캐시된 파일이라 추가 용량 없음)를
// 그대로 돌린다 — transform(rotate) 하나만 애니메이션해서 가볍다.
import { Logo } from "./Logo";

export function PageLoader({
  label = "불러오는 중",
  compact = false,
}: {
  label?: string;
  /** 검색결과 영역처럼 위에 이미 검색창·필터 같은 콘텐츠가 쌓여있는 자리에 쓸 때 true —
   *  화면 높이를 강제로 채우지 않고 놓인 자리에서 바로 보이게 한다. 그렇지 않으면
   *  세로 중앙 정렬 때문에 로더가 화면 아래로 밀려나 안 보일 수 있다. */
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={
        compact
          ? "flex flex-col items-center justify-center px-4 py-12"
          // 로딩 중엔 아래 푸터가 화면에 걸쳐 보이지 않도록 뷰포트 대부분을 채운다.
          : "flex min-h-[85vh] flex-col items-center justify-center px-4 py-16"
      }
    >
      <Logo className="h-16 w-16 animate-[spin_2.2s_linear_infinite]" />
    </div>
  );
}
