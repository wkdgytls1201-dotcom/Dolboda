import { auth } from "@/auth";
import { CONSULT_NOTIFY_EMAIL } from "./resend";

// 운영자 판별 (서버 전용).
//
// 별도 권한 테이블을 만들지 않는다 — 운영자가 한두 명인 단계에서 role 테이블은
// 관리 대상만 늘리고 실수(권한 부여 누락·회수 누락)의 자리를 만든다.
//
//   ADMIN_EMAILS=a@x.com,b@y.com     이메일로 허용
//   ADMIN_USER_IDS=cms...,cms...     계정 id로 허용
//
// 둘 중 하나만 맞으면 통과다. **id 허용이 필요한 이유**: 카카오 로그인은 이메일 제공
// 동의 항목이 꺼져 있으면 이메일을 아예 안 준다 — 실측에서 운영자 계정이 email=null이라
// 이메일 판별만으로는 영영 못 들어갔다. /admin의 권한 없음 화면이 본인 계정 id를
// 보여주므로, 그 값을 ADMIN_USER_IDS에 넣으면 된다.
function envList(name: string, fallback = ""): string[] {
  return (process.env[name] ?? fallback)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return envList("ADMIN_EMAILS", CONSULT_NOTIFY_EMAIL)
    .map((e) => e.toLowerCase())
    .includes(email.trim().toLowerCase());
}

function isAdminUserId(userId: string): boolean {
  return envList("ADMIN_USER_IDS").includes(userId);
}

/**
 * 운영자 계정인지 (세션 조회 없이 id만으로).
 *
 * 돌봄 흐름을 계정 하나로 끝까지 시험해보려면 보호자로 글을 올리고 매니저로 지원하는
 * 자기 지원이 필요하다. 일반 사용자에게는 막아야 하지만(자기가 자기를 매칭하고 합의서까지
 * 쓰게 된다) 운영자에게는 열어둔다 — 프로덕션에서도 계정 두 개를 만들지 않고 확인할 수
 * 있어야 하기 때문에 NODE_ENV가 아니라 운영자 판별로 연다.
 */
export function isAdminUser(userId: string, email?: string | null): boolean {
  return isAdminUserId(userId) || isAdminEmail(email);
}

export interface AdminSession {
  userId: string;
  email: string;
}

/** 로그인 + 운영자 여부를 함께 본다. 아니면 null. */
export async function requireAdmin(): Promise<AdminSession | null> {
  const session = await auth();
  const email = session?.user?.email;
  const userId = session?.user?.id;
  if (!userId) return null;
  if (!isAdminEmail(email) && !isAdminUserId(userId)) return null;
  return { userId, email: email ?? "(이메일 미제공 계정)" };
}

/** 권한 없음 화면에서 "당신의 계정 id"를 보여주기 위한 세션 요약. */
export async function currentSessionInfo(): Promise<{ userId: string; email: string | null } | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  return { userId, email: session?.user?.email ?? null };
}
