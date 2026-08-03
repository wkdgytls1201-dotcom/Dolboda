import {
  Armchair,
  Bath,
  Footprints,
  Hand,
  Layers,
  Package,
  CandyCane,
  Grid3x3,
  MoveUp,
  MoveUpRight,
  ShieldCheck,
  Accessibility,
  BedDouble,
  BedSingle,
  Bed,
  Radio,
  type LucideIcon,
} from "lucide-react";

// 품목명 → 아이콘. emoji 대신 브랜드 톤의 원형 배지로 통일해 시각적 신뢰도를 올린다.
// (이모지는 기기마다 다르게 렌더되고 브랜드 색을 못 입힌다)
const ICON_MAP: Record<string, LucideIcon> = {
  이동변기: Armchair,
  목욕의자: Bath,
  "성인용 보행기": Footprints,
  안전손잡이: Hand,
  미끄럼방지용품: Layers,
  간이변기: Package,
  지팡이: CandyCane,
  욕창예방방석: Grid3x3,
  자세변환용구: MoveUp,
  요실금팬티: ShieldCheck,
  수동휠체어: Accessibility,
  전동침대: BedDouble,
  수동침대: BedSingle,
  욕창예방매트리스: Bed,
  이동욕조: Bath,
  목욕리프트: MoveUp,
  배회감지기: Radio,
  경사로: MoveUpRight,
};

// 세 톤을 순환시켜 그리드가 단조롭지 않게 한다 — 새 카테고리 컬러를 만들지 않고
// 기존 브랜드 토큰만 재사용한다(dataviz 스킬 기준, welfare-benefit 1-H와 동일 원칙).
const TONES = [
  { bg: "bg-primary-50", text: "text-primary-600" },
  { bg: "bg-mint-50", text: "text-mint-700" },
  { bg: "bg-royal-50", text: "text-royal-600" },
] as const;

export function toneOf(index: number) {
  return TONES[index % TONES.length];
}

export function WelfareItemIcon({
  name,
  index = 0,
  size = 22,
  className = "",
}: {
  name: string;
  index?: number;
  size?: number;
  className?: string;
}) {
  const Icon = ICON_MAP[name] ?? Package;
  const tone = toneOf(index);
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${tone.bg} ${tone.text} ${className}`}
      aria-hidden
    >
      <Icon size={size} strokeWidth={2} />
    </span>
  );
}
