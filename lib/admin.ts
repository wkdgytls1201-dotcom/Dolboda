import { auth } from "@/auth";
import { CONSULT_NOTIFY_EMAIL } from "./resend";

// 운영자 판별 (서버 전용).
//
// 별도 권한 테이블을 만들지 않는다 — 운영자가 한두 명인 단계에서 role 테이블은
// 관리 대상만 늘리고 실수(권한 부여 누락·회수 누락)의 자리를 만든다.
// 환경변수에 이메일을 적어두고, 없으면 이미 모든 알림을 받고 있는 운영자 주소를 쓴다.
//
//   ADMIN_EMAILS=a@x.com,b@y.com
//
// ⚠️ 카카오 로그인은 이메일을 항상 주지는 않는다. 운영자 계정은 이메일이 있는 상태여야
// 하며, 없으면 여기서 걸러진다(= 아무나 통과하는 일은 없다).
function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? CONSULT_NOTIFY_EMAIL;
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
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
  if (!userId || !isAdminEmail(email)) return null;
  return { userId, email: email as string };
}
