// realNhisData.json(서울 2,221건) 중 데모용으로 다양성 있는 소수 표본을 추려
// lib/realNhisData.ts (TypeScript, Facility[] 타입)로 생성한다.
// 클라이언트 번들에 2,221건을 통째로 넣기엔 크므로, DB 구축 전까지는 이 표본만 앱에서 사용.
// 전체 2,221건 원본은 lib/realNhisData.json에 그대로 남겨두고 추후 DB 시딩에 사용.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const all = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "lib", "realNhisData.json"), "utf8")
);

const districts = new Set();
const picked = [];

const wantByType = { NURSING_HOME: 10, DAY_NIGHT_CARE: 6, HOME_CARE: 4 };
const countByType = { NURSING_HOME: 0, DAY_NIGHT_CARE: 0, HOME_CARE: 0 };

// 인력/평가 데이터가 실제로 채워져 있고, 구가 겹치지 않게 다양성 우선으로 선택
const shuffled = [...all].sort(() => Math.random() - 0.5);
for (const f of shuffled) {
  if (countByType[f.facilityType] >= wantByType[f.facilityType]) continue;
  const district = f.address.split(" ")[1];
  if (districts.has(district)) continue; // 구 중복 방지 → 다양한 지역 노출
  if (f.facilityType === "NURSING_HOME" && (f.capacity < 20 || f.capacity > 150)) continue;
  if (!f.evaluationDetail) continue;

  picked.push(f);
  districts.add(district);
  countByType[f.facilityType]++;
}

console.log(`선택된 표본: ${picked.length}건`, countByType);

const header = `// scripts/sample-nhis.mjs 로 realNhisData.json에서 추출한 실제 공공데이터 표본(서울, ${picked.length}건).
// 출처: 국민건강보험공단 장기요양기관 시설별 현황(2026-06-10) + 평가 결과(2026-06-25).
// 전화번호/좌표/병실구성/프로그램/비급여비용은 두 파일에 없어 undefined/빈 배열로 둠(임의값 아님).
import { Facility } from "./types";

export const REAL_NHIS_FACILITIES: Facility[] = `;

const out = header + JSON.stringify(picked, null, 2) + ";\n";
fs.writeFileSync(path.join(__dirname, "..", "lib", "realNhisData.ts"), out, "utf8");
console.log("저장: lib/realNhisData.ts");
