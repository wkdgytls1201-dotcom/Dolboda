import { createHash } from "crypto";
import { stableStringify, type AgreementContent } from "./careAgreement";

// 서명 대상 문서의 지문(SHA-256) — 서버 전용.
//
// node:crypto를 lib/careAgreement.ts(클라이언트 컴포넌트도 import하는 파일)에 두면
// 합의서 화면 번들에 crypto 폴리필이 통째로 딸려와 236KB까지 부푼다(실측).
// 그래서 해싱만 이 파일로 떼어 서버에서만 쓴다.
export function hashAgreement(content: AgreementContent): string {
  return createHash("sha256").update(stableStringify(content)).digest("hex");
}
