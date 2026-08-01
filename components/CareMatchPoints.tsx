"use client";

import { useState } from "react";
import Link from "next/link";
import { HeartHandshake, Check, Minus } from "lucide-react";
import type { Facility } from "@/lib/types";
import { isHospital } from "@/lib/types";
import { useCareProfiles, type CareProfileSummary } from "@/lib/careProfileContext";
import { gradeFacilityFit } from "@/lib/ltcGuide";

// 시설 상세의 "우리 어르신 기준 체크포인트".
//
// 원칙: 돌봄 프로필의 상태와 이 시설의 공공데이터가 직접 이어질 때만 항목을 만든다.
// 추측·과장은 안심지수 신뢰까지 깎는다 — 근거 없는 항목은 아예 안 보여주는 게 낫다.
// 좋은 것만 골라 보여주지도 않는다: "치매전담실 없음"도 그대로 말한다(중립 표기).
// 이 정직함이 슬로건("정보 비대칭 없는 투명한 돌봄")의 실체다.

interface Point {
  label: string;
  /** true = 있음(초록 체크), false = 없음(회색 —, 감점 아님·확인 포인트) */
  ok: boolean;
  detail?: string;
}

function pointsFor(profile: CareProfileSummary, f: Facility): Point[] {
  if (isHospital(f)) return []; // 요양병원은 데이터 구조가 달라 v1에서는 제외
  const points: Point[] = [];

  // 장기요양등급으로 이 유형의 시설을 이용할 수 있는지 — 확실한 조합만 말한다
  const fit = gradeFacilityFit(profile.ltcGrade, f.facilityType);
  if (fit) {
    points.push({
      label: `${profile.ltcGrade}로 이용`,
      ok: fit.ok,
      detail: fit.note,
    });
  }

  // 치매·인지저하 → 치매전담실 + 인지 프로그램
  if (profile.conditions.includes("치매·인지저하")) {
    points.push({
      label: "치매전담실",
      ok: Boolean(f.hasDementiaUnit),
      detail: f.hasDementiaUnit ? "전용 생활공간 운영" : "운영 정보 없음 — 방문 시 확인해보세요",
    });
    const cog = (f.programTags ?? []).find((t) => t.tag === "cognitive");
    points.push({
      label: "인지·치매 예방 프로그램",
      ok: Boolean(cog),
      detail: cog
        ? `${cog.count}종 운영${cog.weekly > 0 ? ` · 주 ${Math.round(cog.weekly)}회` : ""}`
        : "공개된 프로그램 정보에 없음",
    });
  }

  // 거동이 무거움 → 간호인력·재활실 (부축·체위변경·의료 대응 부담과 직결)
  const heavyMobility =
    profile.mobilityLevel === "휠체어 이용" || profile.mobilityLevel === "거의 누워 지냄";
  if (heavyMobility || profile.conditions.includes("뇌졸중 후유증")) {
    const nurses = f.staffDetail.medical.nurses + f.staffDetail.medical.nursingAssistants;
    points.push({
      label: "간호 인력",
      ok: nurses > 0,
      detail: nurses > 0 ? `${nurses}명 배치` : "배치 정보 없음",
    });
    points.push({
      label: "재활·훈련실",
      ok: f.facilityRooms.medical.rehabRoom > 0,
      detail: f.facilityRooms.medical.rehabRoom > 0 ? "보유" : "보유 정보 없음",
    });
    const therapy = (f.programTags ?? []).find((t) => t.tag === "therapy");
    if (therapy) {
      points.push({ label: "재활 치료 프로그램", ok: true, detail: `${therapy.count}종 운영` });
    }
  }

  // 욕창·의료 처치 계열 → 간호인력 (위에서 안 만들어졌을 때만)
  if (
    (profile.conditions.includes("욕창 관리") || profile.conditions.includes("산소호흡기 사용")) &&
    !points.some((p) => p.label === "간호 인력")
  ) {
    const nurses = f.staffDetail.medical.nurses + f.staffDetail.medical.nursingAssistants;
    points.push({
      label: "간호 인력",
      ok: nurses > 0,
      detail: nurses > 0 ? `${nurses}명 배치` : "배치 정보 없음",
    });
  }

  return points;
}

export function CareMatchPoints({ facility }: { facility: Facility }) {
  const { profiles } = useCareProfiles();
  const [activeId, setActiveId] = useState<string | null>(null);

  if (profiles.length === 0) return null;
  const active = profiles.find((p) => p.id === activeId) ?? profiles[0];
  const points = pointsFor(active, facility);
  if (points.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-primary-100 bg-primary-50/40 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink-900">
          <HeartHandshake size={16} className="text-primary-500" />
          {active.relation} 기준 체크포인트
        </h3>
        {profiles.length > 1 && (
          <div className="flex gap-1.5">
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveId(p.id)}
                className={`flex min-h-[40px] items-center rounded-full px-3.5 text-[12px] font-bold transition-colors ${
                  p.id === active.id
                    ? "bg-primary-500 text-white"
                    : "bg-white text-ink-500 shadow-card"
                }`}
              >
                {p.relation}
              </button>
            ))}
          </div>
        )}
      </div>

      <ul className="space-y-2">
        {points.map((pt) => (
          <li key={pt.label} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                pt.ok ? "bg-mint-100 text-mint-700" : "bg-ink-100/60 text-ink-300"
              }`}
            >
              {pt.ok ? <Check size={12} /> : <Minus size={12} />}
            </span>
            <span className="text-[13px] leading-relaxed text-ink-700">
              <strong className="font-bold">{pt.label}</strong>
              {pt.detail && <span className="text-ink-500"> — {pt.detail}</span>}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[12px] leading-relaxed text-ink-400">
        저장하신 돌봄 프로필과 공공데이터를 맞춰본 참고 정보예요.{" "}
        <Link href="/mypage/care-profile" className="font-semibold text-ink-500 underline">
          프로필 수정
        </Link>
      </p>
    </section>
  );
}
