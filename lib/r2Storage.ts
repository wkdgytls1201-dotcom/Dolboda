// Cloudflare R2 최소 업로드 클라이언트 — lib/supabaseStorage.ts와 같은 인터페이스로 맞춰서
// 호출부(사진 업로드 API, 대량 임포트 스크립트)가 스토리지를 바꿔치기해도 코드를 안 고치게 한다.
//
// R2를 고른 이유: 트래픽(egress) 요금이 0원이다. 사진은 저장보다 "보여주는" 횟수가
// 압도적으로 많은 자산이라, 같은 용량이어도 Supabase보다 실제 운영비가 크게 낮다.
//
// 필요한 환경변수:
//   R2_ACCOUNT_ID          Cloudflare 대시보드 → R2 → 계정 ID
//   R2_ACCESS_KEY_ID       R2 → "API 토큰 관리" → S3 호환 자격증명
//   R2_SECRET_ACCESS_KEY   위와 함께 발급됨
//   R2_BUCKET              버킷 이름 (예: facility-photos)
//   R2_PUBLIC_URL           버킷의 공개 읽기 URL (r2.dev 서브도메인 또는 연결한 커스텀 도메인,
//                            끝에 슬래시 없이. 예: https://pub-xxxx.r2.dev)
// 하나라도 없으면 isStorageConfigured()가 false — 호출부는 "아직 준비 안 됨"을 알려야 한다.

import { AwsClient } from "aws4fetch";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

const ENDPOINT = ACCOUNT_ID ? `https://${ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined;

let client: AwsClient | null = null;
function getClient(): AwsClient {
  if (!client) {
    if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY) throw new Error("R2 자격증명이 없습니다.");
    client = new AwsClient({
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
      // R2는 리전 개념이 없지만 SigV4 서명에는 값이 필요하다 — "auto"가 R2 공식 권장값
      region: "auto",
      service: "s3",
    });
  }
  return client;
}

export function isR2Configured(): boolean {
  return Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET && PUBLIC_URL);
}

/** 파일을 올리고 공개 URL을 돌려준다. 같은 경로면 덮어쓴다. */
export async function uploadToR2(
  path: string,
  body: ArrayBuffer | Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  if (!isR2Configured()) throw new Error("R2 환경변수가 없습니다.");
  const url = `${ENDPOINT}/${BUCKET}/${path}`;
  const res = await getClient().fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: body as BodyInit,
  });
  if (!res.ok) {
    throw new Error(`R2 업로드 실패(${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  return `${PUBLIC_URL}/${path}`;
}

/** 지우기 실패는 치명적이지 않다(고아 파일만 남음) — 호출부에서 무시해도 된다. */
export async function deleteFromR2(path: string): Promise<void> {
  if (!isR2Configured()) return;
  const url = `${ENDPOINT}/${BUCKET}/${path}`;
  await getClient()
    .fetch(url, { method: "DELETE" })
    .catch(() => {});
}

/** 공개 URL에서 버킷 내부 경로만 뽑는다(삭제할 때 필요). 우리 것이 아니면 null. */
export function pathFromR2Url(url: string | null | undefined): string | null {
  if (!url || !PUBLIC_URL) return null;
  const prefix = `${PUBLIC_URL}/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}
