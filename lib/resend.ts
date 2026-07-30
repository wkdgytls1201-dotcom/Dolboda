import { Resend } from "resend";

// RESEND_API_KEY 없으면(로컬 개발 등) 이메일 발송만 건너뛰고 DB 저장은 그대로 진행한다.
export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const CONSULT_NOTIFY_EMAIL = "wkdgytls1201@gmail.com";
