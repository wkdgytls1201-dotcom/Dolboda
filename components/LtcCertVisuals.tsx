// 요양인정번호 등록 화면 전용 그림.
//
// 외부 이미지를 쓰지 않는다 — CSS로 그리면 로딩이 즉시 끝나고 모바일에서도 또렷하다.

/**
 * "요양인정번호 확인방법" — 실제 장기요양인정서에서 어느 칸을 보면 되는지 보여주는 목업.
 *
 * 공단 서식을 그대로 스캔해 올리면 저작·초상 문제가 생길 수 있고 파일도 무겁다.
 * 항목 이름과 배치만 같은 목업을 CSS로 만들어, "이 칸을 보세요"만 정확히 전달한다
 * (/business 콘솔 미리보기와 같은 방식).
 */
export function LtcCertSample() {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
      <p className="border-b border-ink-100 bg-ivory-100 py-2.5 text-center text-[12px] font-bold text-ink-700">
        장기요양인정서
      </p>
      <dl className="divide-y divide-ink-100 text-[12px]">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <dt className="w-20 shrink-0 text-ink-400">성명</dt>
          <dd className="font-semibold text-ink-700">홍길동</dd>
        </div>
        {/* 여기가 찾아야 할 칸 — 배경·테두리·굵기를 한꺼번에 줘서 눈이 바로 간다 */}
        <div className="flex items-center gap-3 bg-primary-50/70 px-4 py-3">
          <dt className="w-20 shrink-0 font-bold text-primary-700">
            장기요양
            <br />
            인정번호
          </dt>
          <dd className="min-w-0">
            <span className="inline-flex flex-wrap items-baseline gap-x-1 rounded-lg border-2 border-primary-400 bg-white px-2.5 py-1.5">
              <span className="text-[13px] font-bold text-ink-300">L</span>
              <span className="text-[15px] font-extrabold tracking-wide text-primary-600">
                1234567891
              </span>
              <span className="text-[13px] font-bold text-ink-300">- 100</span>
            </span>
            <span className="mt-1.5 block text-[11px] font-semibold text-primary-700">
              ↑ 가운데 숫자 10자리만 입력해요
            </span>
          </dd>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <dt className="w-20 shrink-0 text-ink-400">유효기간</dt>
          <dd className="text-ink-700">2024.01.01 ~ 2026.12.31</dd>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <dt className="w-20 shrink-0 text-ink-400">장기요양등급</dt>
          <dd className="text-ink-700">3등급</dd>
        </div>
      </dl>
    </div>
  );
}
