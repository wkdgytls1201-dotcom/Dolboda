import { useEffect, useRef, useState } from "react";

/**
 * 요소가 화면 근처에 처음 들어온 시점을 알려준다(한 번 true가 되면 그대로 유지).
 *
 * 무거운 외부 리소스(카카오맵 SDK·지도 타일·로드뷰 파노라마)를 쓰는 블록에 붙여
 * "실제로 볼 때만" 받아오게 하는 용도다. 시설 상세는 지도·로드뷰가 화면 한참
 * 아래에 있는데도 페이지를 열자마자 SDK와 타일 6장을 받고 있었다.
 *
 * IntersectionObserver를 쓰되, 스크롤 이벤트 + 좌표 계산(getBoundingClientRect)을
 * 백업으로 함께 둔다. IO가 없거나(구형 웹뷰) 있어도 발화하지 않는 환경이 실제로
 * 존재하는데, 그 경우 지도가 영영 안 뜨는 기능 손실이 되기 때문이다.
 * 둘 중 먼저 감지한 쪽이 이기고, 감지 후에는 양쪽 다 해제한다.
 *
 * margin 기본값 300px: 스크롤해서 도달하기 전에 미리 준비돼 빈 박스가 보이지 않는다.
 */
export function useInViewOnce<T extends HTMLElement = HTMLDivElement>(margin = 300) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;

    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      setInView(true);
    };

    // 백업 경로: 스크롤할 때마다(100ms 스로틀) 요소가 화면 근처에 왔는지 직접 잰다.
    // 스로틀에 requestAnimationFrame을 쓰면 안 된다 — 프레임을 그리지 않는 상황
    // (백그라운드 탭·비합성 환경)에서 콜백이 밀려 백업 경로가 함께 죽는다.
    let timer = 0;
    const check = () => {
      timer = 0;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight + margin && r.bottom > -margin) reveal();
    };
    const onScroll = () => {
      if (timer) return;
      timer = window.setTimeout(check, 100);
    };

    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver((entries) => entries[0].isIntersecting && reveal(), {
            rootMargin: `${margin}px`,
          })
        : null;
    io?.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    // 첫 화면에 이미 들어와 있는 경우(IO 없는 환경 대비)도 즉시 확인한다
    check();

    return () => {
      io?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (timer) clearTimeout(timer);
    };
  }, [inView, margin]);

  return { ref, inView };
}
