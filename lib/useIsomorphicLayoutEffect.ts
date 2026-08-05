import { useEffect, useLayoutEffect } from "react";

/**
 * 브라우저에서는 useLayoutEffect, 서버에서는 useEffect.
 *
 * localStorage·sessionStorage에 저장해둔 값을 복원할 때 쓴다. useEffect로 복원하면
 * 화면을 **그린 뒤**에 실행돼 복원 전 상태가 한 번 번쩍이고(등급테스트에서 실제로 겪었다),
 * 렌더 도중에 읽으면 서버에는 그 값이 없어 하이드레이션이 깨진다. useLayoutEffect는
 * 그리기 직전에 돌아 둘 다 피한다.
 *
 * 서버에서 useLayoutEffect를 부르면 React가 경고를 내므로 그쪽만 useEffect로 바꿔친다
 * (서버에서는 effect가 아예 실행되지 않아 동작 차이가 없다).
 */
export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
