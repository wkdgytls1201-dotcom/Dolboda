import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rateLimit";
import { isStorageConfigured, uploadPublicObject } from "@/lib/supabaseStorage";

// 돌봄일지 사진 업로드 (care-log-spec §9-2) — 매니저 전용.
//
// 프로필 사진(/api/sitter-profile/photo)과 같은 방식: 브라우저(lib/squareImage.ts의
// toResizedImage)가 긴 변 1280px WebP로 줄여서 보내고, 여기서는 결과만 받아 저장한다.
// 본문은 multipart가 아니라 이미지 바이트 그대로다.
//
// 저장 위치: 기존 sitter-photos 공개 버킷의 care-log/{careRequestId}/ 경로.
// 공개 버킷이지만 경로가 추측 불가(cuid+시각)라 링크를 아는 당사자만 본다 —
// 서명 URL(비공개 버킷)로의 업그레이드 경로는 스펙 §9-2에 기록.

const BUCKET = "sitter-photos";
const MAX_BYTES = 600 * 1024;
const ALLOWED = new Set(["image/webp", "image/jpeg", "image/png"]);

async function findSitterContext(userId: string) {
  const profile = await prisma.sitterProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) return null;
  const app = await prisma.careRequestApplication.findFirst({
    where: { sitterProfileId: profile.id, status: { in: ["매칭확정", "돌봄완료"] } },
    orderBy: { createdAt: "desc" },
    select: { careRequestId: true },
  });
  return app ? { careRequestId: app.careRequestId } : null;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "사진 저장소가 아직 연결되지 않았어요. 잠시 후 다시 시도해주세요." },
      { status: 503 }
    );
  }

  const limited = rateLimit(`care-log-photo:${clientIp(req)}`, 30, 60 * 60 * 1000);
  if (!limited.ok) {
    return tooManyRequests("잠시 후 다시 시도해주세요.", limited.retryAfter);
  }

  const ctx = await findSitterContext(session.user.id);
  if (!ctx) {
    return NextResponse.json({ error: "돌봄일지 사진은 매니저만 올릴 수 있어요." }, { status: 403 });
  }

  const contentType = (req.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!ALLOWED.has(contentType)) {
    return NextResponse.json({ error: "JPG·PNG·WebP 사진만 올릴 수 있어요." }, { status: 400 });
  }

  const bytes = await req.arrayBuffer();
  if (bytes.byteLength === 0) {
    return NextResponse.json({ error: "사진 파일이 비어 있어요." }, { status: 400 });
  }
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "사진 용량이 너무 커요." }, { status: 413 });
  }

  const ext = contentType === "image/png" ? "png" : contentType === "image/jpeg" ? "jpg" : "webp";
  const path = `care-log/${ctx.careRequestId}/${Date.now()}.${ext}`;

  try {
    const url = await uploadPublicObject(BUCKET, path, bytes, contentType);
    return NextResponse.json({ url });
  } catch (e) {
    console.error("돌봄일지 사진 업로드 실패:", e);
    return NextResponse.json({ error: "사진을 저장하지 못했어요." }, { status: 502 });
  }
}
