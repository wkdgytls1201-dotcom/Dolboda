import { Building2, Sparkles, Home, type LucideIcon } from "lucide-react";

export type LocationTypeValue = "HOSPITAL" | "HOUSEKEEPING" | "HOME";

// 돌봄 유형 3종 — 요청 마법사, 시터 일자리 카드, 돌봄 확인서에서 공용.
export const LOCATION_TYPES: {
  value: LocationTypeValue;
  label: string;
  desc: string;
  icon: LucideIcon;
  iconClass: string;
  badgeClass: string;
}[] = [
  {
    value: "HOSPITAL",
    label: "병원 간병",
    desc: "입원 중인 병원에서 곁을 지키며 간병해드려요",
    icon: Building2,
    iconClass: "bg-primary-50 text-primary-600",
    badgeClass: "bg-primary-50 text-primary-700",
  },
  {
    value: "HOUSEKEEPING",
    label: "가사 돌봄",
    desc: "정기적으로 방문해 집안일과 일상을 챙겨드려요",
    icon: Sparkles,
    iconClass: "bg-mint-100 text-mint-700",
    badgeClass: "bg-mint-100 text-mint-700",
  },
  {
    value: "HOME",
    label: "자택 돌봄",
    desc: "지내시는 집에서 생활 전반을 도와드려요",
    icon: Home,
    iconClass: "bg-peach-100 text-peach-700",
    badgeClass: "bg-peach-100 text-peach-700",
  },
];

export function typeMeta(value: LocationTypeValue) {
  return LOCATION_TYPES.find((t) => t.value === value) ?? LOCATION_TYPES[0];
}
