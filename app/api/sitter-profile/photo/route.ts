import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  deletePublicObject,
  isStorageConfigured,
  pathFromPublicUrl,
  uploadPublicObject,
} from "@/lib/supabaseStorage";

// 매니저 프로필 사진 업로드/삭제.
//
// 사진 파일은 브라우저(lib/squareImage.ts)에서 이미 512px 정사각 WebP로 줄여서 온다 —
// 여기서는 그 결과만 받아 저장한다. 서버에서 이미지 처리 라이브러리를 쓰지 않는 이유는
// sharp 같은 의존성이 서버리스 번들을 수십 MB 늘리기 때문이다.
//
// 본문은 multipart가 아니라 이미지 바이트 그대로다(파싱 비용·경계 처리 없이 가장 가볍다).

const BUCKET = "sitter-photos";
const MAX_BYTES = 400 * 1024;
const ALLOWED = new Set(["image/webp", "image/jpeg", "image/png"]);

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

  const contentType = (req.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!ALLOWED.has(contentType)) {
    return NextResponse.json({ error: "JPG·PNG·WebP 사진만 올릴 수 있어요." }, { status: 400 });
  }

  const profile = await prisma.sitterProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, photoUrl: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "등록된 돌보다 매니저 프로필이 없어요." }, { status: 404 });
  }

  const bytes = await req.arrayBuffer();
  if (bytes.byteLength === 0) {
    return NextResponse.json({ error: "사진 파일이 비어 있어요." }, { status: 400 });
  }
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "사진 용량이 너무 커요." }, { status: 413 });
  }

  const ext = contentType === "image/png" ? "png" : contentType === "image/jpeg" ? "jpg" : "webp";
  // 파일명에 시각을 넣어 매번 새 경로로 올린다 — 같은 경로로 덮어쓰면 CDN·브라우저가
  // 예전 사진을 계속 보여준다. 대신 이전 파일은 아래에서 지운다.
  const path = `${profile.id}/${Date.now()}.${ext}`;

  let publicUrl: string;
  try {
    publicUrl = await uploadPublicObject(BUCKET, path, bytes, contentType);
  } catch (e) {
    console.error("프로필 사진 업로드 실패:", e);
    return NextResponse.json({ error: "사진을 저장하지 못했어요." }, { status: 502 });
  }

  const updated = await prisma.sitterProfile.update({
    where: { id: profile.id },
    data: { photoUrl: publicUrl },
    include: { certifications: true },
  });

  // 이전 사진 정리 — 실패해도 사용자에겐 영향이 없다(고아 파일만 남는다)
  const oldPath = pathFromPublicUrl(BUCKET, profile.photoUrl);
  if (oldPath) await deletePublicObject(BUCKET, oldPath);

  return NextResponse.json(updated);
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const profile = await prisma.sitterProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, photoUrl: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "등록된 돌보다 매니저 프로필이 없어요." }, { status: 404 });
  }

  const updated = await prisma.sitterProfile.update({
    where: { id: profile.id },
    data: { photoUrl: null },
    include: { certifications: true },
  });

  const path = pathFromPublicUrl(BUCKET, profile.photoUrl);
  if (path) await deletePublicObject(BUCKET, path);

  return NextResponse.json(updated);
}
