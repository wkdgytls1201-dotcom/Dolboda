import { ShieldCheck } from "lucide-react";

// 시설 상세 하단의 데이터 출처·신뢰 안내. 어떤 국가기관 데이터로 만들었는지 밝혀
// "검증된 정보만 투명하게"라는 돌보다의 원칙을 보여준다. 갱신일을 함께 적어
// 검색엔진에도 콘텐츠 신선도 신호를 준다.
const SOURCES = [
  { name: "국민건강보험공단", desc: "장기요양기관 현황·정기평가·상세정보" },
  { name: "건강보험심사평가원", desc: "요양병원 정보·적정성 평가·비급여" },
  { name: "공공데이터포털", desc: "행정안전부 운영 공공데이터 개방 창구" },
];

export function DataSourceNote({ updatedAt }: { updatedAt?: string }) {
  return (
    <section className="mt-10 rounded-2xl border border-mint-200/70 bg-mint-50/40 p-5">
      <p className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
        <ShieldCheck size={16} className="shrink-0 text-mint-600" />
        검증된 공공데이터만, 투명하게
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
        돌보다는 광고나 임의 입력이 아닌 국가기관 공식 데이터만으로 시설 정보를 제공해요.
        공개되지 않은 항목은 지어내지 않고 &ldquo;미공개&rdquo;로 표시하는 것이 원칙이에요.
      </p>
      <ul className="mt-3 space-y-1.5">
        {SOURCES.map((s) => (
          <li key={s.name} className="flex flex-wrap items-baseline gap-x-2 text-xs">
            <span className="font-bold text-ink-700">{s.name}</span>
            <span className="text-ink-300">{s.desc}</span>
          </li>
        ))}
      </ul>
      {updatedAt && (
        <p className="mt-3 border-t border-mint-200/60 pt-2.5 text-[11px] text-ink-300">
          데이터 기준일 {updatedAt} · 실제 이용 전 시설에 직접 확인해 주세요
        </p>
      )}
    </section>
  );
}
