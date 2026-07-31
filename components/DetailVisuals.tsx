import { Activity, ScanLine, Scan, Waves, Stethoscope, Users, LucideIcon } from "lucide-react";

// 5단계/6단계 등급을 척도 위 위치로 보여주는 게이지. 숫자만 나열하지 않고
// 전체 등급 범위 중 이 시설이 어디에 있는지 한눈에 보여주기 위한 용도.
// 등급 척도 색 — 1등급(좋음)은 민트, 마지막 등급(주의)은 코랄로 자연스럽게 이어지는 신호등 팔레트
const SCALE_COLORS: Record<number, string[]> = {
  4: ["bg-mint-500", "bg-mint-300", "bg-accent-400", "bg-primary-500"],
  5: ["bg-mint-500", "bg-mint-300", "bg-accent-300", "bg-accent-500", "bg-primary-500"],
  6: ["bg-mint-500", "bg-mint-400", "bg-mint-300", "bg-accent-300", "bg-accent-500", "bg-primary-500"],
};

export function GradeScaleBar({
  grade,
  levels,
}: {
  grade: number | null;
  levels: number;
}) {
  if (grade === null) {
    return <p className="text-sm text-ink-300">등급 제외 시설이에요.</p>;
  }

  const colors = SCALE_COLORS[levels] ?? SCALE_COLORS[5];

  return (
    <div className="flex items-end gap-1">
      {Array.from({ length: levels }).map((_, i) => {
        const level = i + 1;
        const isCurrent = level === grade;
        return (
          <div key={level} className="flex flex-1 flex-col items-center">
            {/* 현재 등급 위에만 말풍선 배지 — 다른 칸은 같은 높이의 빈 공간으로 정렬 유지 */}
            <div className="mb-1.5 flex h-7 items-end justify-center">
              {isCurrent && (
                <div className="flex flex-col items-center">
                  <span className="whitespace-nowrap rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-bold leading-none text-white shadow-card">
                    {level}등급
                  </span>
                  <span className="-mt-px h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-ink-900" />
                </div>
              )}
            </div>
            <div
              className={`w-full transition-all ${
                isCurrent
                  ? `h-3.5 rounded-lg ${colors[i]} ring-2 ring-white shadow-card`
                  : `h-2 rounded-md ${colors[i]} opacity-30`
              } ${i === 0 ? "rounded-l-full" : ""} ${i === levels - 1 ? "rounded-r-full" : ""}`}
            />
            <span
              className={`mt-1.5 text-[11px] ${
                isCurrent ? "font-bold text-ink-900" : "text-ink-300"
              }`}
            >
              {level}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// 인력/시설 수치처럼 대부분 한 자릿수인 항목은 막대보다 숫자 타일이 더 깔끔하다.
// 심볼 없이 값과 라벨만 보여주고, 카테고리 색은 타일 배경 톤으로만 구분한다.
export function StatTileGrid({
  items,
  unit = "명",
  colorClassName = "bg-primary-50 text-primary-700",
}: {
  items: { label: string; value: number }[];
  unit?: string;
  colorClassName?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className={`rounded-2xl p-4 text-center ${colorClassName}`}>
          <p className="text-xl font-bold">
            {item.value}
            {unit}
          </p>
          <p className="mt-1 text-sm text-ink-500">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

// 정원 대비 현원을 채움 막대(meter)로 표현 — 남은 자리를 바로 보여준다.
export function CapacityMeter({
  capacity,
  occupancy,
  waitlistCount,
}: {
  capacity: number;
  occupancy?: number;
  waitlistCount?: number;
}) {
  const vacancy = occupancy !== undefined ? Math.max(0, capacity - occupancy) : undefined;
  const pct =
    occupancy !== undefined && capacity > 0
      ? Math.min(100, Math.round((occupancy / capacity) * 100))
      : 0;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm text-ink-500">
          <Users size={14} />
          {occupancy !== undefined ? (
            <>
              현원 <span className="font-bold text-ink-900">{occupancy}명</span> / 정원{" "}
            </>
          ) : null}
          <span className="font-bold text-ink-900">{capacity}명</span>
          {occupancy === undefined && <span className="text-ink-300">(정원, 현원 정보 미제공)</span>}
        </p>
        <div className="flex gap-1.5">
          {vacancy === undefined ? null : vacancy > 0 ? (
            <span className="rounded-full bg-mint-100 px-3 py-1 text-xs font-bold text-mint-700">
              입소 가능 {vacancy}자리
            </span>
          ) : (
            <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-bold text-ink-500">
              정원 마감
            </span>
          )}
          {waitlistCount !== undefined && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                waitlistCount > 0 ? "bg-accent-100 text-accent-600" : "bg-mint-100 text-mint-700"
              }`}
            >
              대기 {waitlistCount > 0 ? `${waitlistCount}명` : "없음"}
            </span>
          )}
        </div>
      </div>
      <div className="h-3 w-full rounded-full bg-mint-50">
        <div
          className="h-3 rounded-full bg-mint-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// 이 시설의 평가 총점을 전체 평균과 나란히 비교하는 막대.
export function ScoreCompareBar({
  score,
  average,
  averageLabel = "전체 평균",
  max = 100,
}: {
  score: number;
  average: number;
  averageLabel?: string;
  max?: number;
}) {
  const scorePct = Math.min(100, (score / max) * 100);
  const avgPct = Math.min(100, (average / max) * 100);
  const better = score >= average;

  return (
    <div>
      <div className="relative h-4 w-full rounded-full bg-ink-100">
        <div
          className="h-4 rounded-full bg-primary-600 transition-all"
          style={{ width: `${scorePct}%` }}
        />
        <div
          className="absolute top-1/2 h-6 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-400 shadow-[0_0_0_1.5px_rgba(27,23,48,0.55)]"
          style={{ left: `${avgPct}%` }}
          title={`${averageLabel} ${average}점`}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-bold text-primary-700">이 시설 {score}점</span>
        <span className="text-ink-300">
          {averageLabel} {average}점
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            better ? "bg-mint-100 text-mint-700" : "bg-ink-100 text-ink-500"
          }`}
        >
          평균 대비 {better ? "+" : ""}
          {(score - average).toFixed(1)}점
        </span>
      </div>
    </div>
  );
}

// 영역별 점수를 오각형 레이더로 보여준다. 같은 등급이어도 어느 영역이 강하고
// 약한지 형태로 바로 드러나서, 총점/등급 하나만 보는 것보다 비교에 훨씬 유용하다.
export function DomainRadar({
  domains,
  max = 100,
  color = "#EB4632",
}: {
  domains: { name: string; score: number }[];
  max?: number;
  color?: string;
}) {
  // 가로는 라벨("환경 및 안전 94점")이 잘리지 않을 만큼 넓게, 세로는 여백을 줄여
  // 좁은 화면에서도 도형이 최대한 크게 보이도록 잡은 값.
  const width = 360;
  const height = 250;
  const cx = width / 2;
  const cy = height / 2;
  const r = 68;
  const n = domains.length;
  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  const points = domains.map((d, i) => {
    const angle = angleFor(i);
    const dist = (Math.max(0, Math.min(d.score, max)) / max) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  });
  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");
  const rings = [0.33, 0.66, 1];

  const strongest = domains.reduce((a, b) => (b.score > a.score ? b : a));
  const weakest = domains.reduce((a, b) => (b.score < a.score ? b : a));

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto w-full max-w-[440px] overflow-visible"
      >
        {rings.map((ringPct) => (
          <polygon
            key={ringPct}
            points={domains
              .map((_, i) => {
                const angle = angleFor(i);
                const dist = ringPct * r;
                return `${cx + dist * Math.cos(angle)},${cy + dist * Math.sin(angle)}`;
              })
              .join(" ")}
            fill="none"
            stroke="#E7E4F0"
            strokeWidth={1}
          />
        ))}
        {domains.map((_, i) => {
          const angle = angleFor(i);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={cx + r * Math.cos(angle)}
              y2={cy + r * Math.sin(angle)}
              stroke="#E7E4F0"
              strokeWidth={1}
            />
          );
        })}
        <polygon points={polygon} fill={color} fillOpacity={0.22} stroke={color} strokeWidth={2} />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={color} />
        ))}
        {domains.map((d, i) => {
          const angle = angleFor(i);
          const labelR = r + 28;
          const cos = Math.cos(angle);
          const x = cx + labelR * cos;
          const y = cy + labelR * Math.sin(angle);
          const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={12}
              fill="#3A3452"
              fontWeight={600}
            >
              <tspan x={x} dy="-0.3em">
                {d.name}
              </tspan>
              <tspan x={x} dy="1.2em" fill="#A9A3BC">
                {d.score}점
              </tspan>
            </text>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs">
        <span className="rounded-full bg-mint-100 px-3 py-1 font-semibold text-mint-700">
          강점 · {strongest.name} {strongest.score}점
        </span>
        <span className="rounded-full bg-accent-100 px-3 py-1 font-semibold text-accent-600">
          보완 필요 · {weakest.name} {weakest.score}점
        </span>
      </div>
    </div>
  );
}

const EQUIPMENT_ICON_RULES: { keywords: string[]; icon: LucideIcon }[] = [
  { keywords: ["엑스선", "X-ray", "방사선"], icon: ScanLine },
  { keywords: ["초음파"], icon: Waves },
  { keywords: ["CT", "MRI", "단층", "자기공명"], icon: Scan },
  { keywords: ["심전도", "심장"], icon: Activity },
];

function iconFor(name: string): LucideIcon {
  const rule = EQUIPMENT_ICON_RULES.find((r) => r.keywords.some((k) => name.includes(k)));
  return rule?.icon ?? Stethoscope;
}

export function EquipmentGrid({ items }: { items: { name: string; count: number }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => {
        const Icon = iconFor(item.name);
        return (
          <div
            key={item.name}
            className="flex flex-col items-center gap-2 rounded-2xl bg-primary-50 p-4 text-center"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary-600 shadow-sm">
              <Icon size={20} />
            </span>
            <p className="text-xs text-ink-700">{item.name}</p>
            <p className="text-sm font-bold text-primary-700">{item.count}대</p>
          </div>
        );
      })}
    </div>
  );
}
