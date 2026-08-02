import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireFacilityOwner,
  activeSubscriptionsFor,
  capabilityOf,
} from "@/lib/facilityOwner";
import {
  deletePublicObject,
  isStorageConfigured,
  pathFromPublicUrl,
  uploadPublicObject,
} from "@/lib/supabaseStorage";

// 시설 콘솔 — 사진 업로드/삭제.
//
// 매니저 프로필 사진과 같은 방식: 브라우저에서 WebP로 줄여 보내고 서버는 저장만 한다.
// 장수 상한은 plan에 따른다(무료 5장 / 유료 30장) — 상한도 화면이 아니라 여기서 지킨다.

const BUCKET = "facility-photos";
const MAX_BYTES = 900 * 1024; // 시설 사진은 가로가 넓어 프로필(400KB)보다 여유를 둔다
const ALLOWED = new Set(["image/webp", "image/jpeg", "image/png"]);

async function photoLimitOf(facilityId: string): Promise<number> {
  const subs = await activeSubscriptionsFor([facilityId]);
  return capabilityOf(subs.get(facilityId) ?? "free").photoLimit;
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facilityId") ?? "";
  const owner = await requireFacilityOwner(facilityId);
  if (!owner) return NextResponse.json({ error: "이 시설을 관리할 권한이 없어요." }, { status: 403 });
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
  // 본문을 읽기 전에 선언된 크기부터 끊는다 — 초과 파일을 메모리에 다 받고 거절하면 낭비다
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) {
    return NextResponse.json({ error: "사진 용량이 너무 커요." }, { status: 413 });
  }

  const existing = await prisma.facilityContent.findUnique({ where: { facilityId } });
  const photos: string[] = Array.isArray(existing?.photos) ? (existing.photos as string[]) : [];
  const limit = await photoLimitOf(facilityId);
  if (photos.length >= limit) {
    return NextResponse.json(
      {
        error:
          limit <= 5
            ? `무료 등록은 사진을 ${limit}장까지 올릴 수 있어요. 비즈니스 플러스에서 30장까지 열립니다.`
            : `사진은 ${limit}장까지 올릴 수 있어요.`,
      },
      { status: 409 }
    );
  }

  const bytes = await req.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "사진 파일을 확인해주세요." }, { status: 400 });
  }

  const ext = contentType === "image/png" ? "png" : contentType === "image/jpeg" ? "jpg" : "webp";
  const path = `${facilityId}/${Date.now()}.${ext}`;

  let publicUrl: string;
  try {
    publicUrl = await uploadPublicObject(BUCKET, path, bytes, contentType);
  } catch (e) {
    console.error("시설 사진 업로드 실패:", e);
    return NextResponse.json({ error: "사진을 저장하지 못했어요." }, { status: 502 });
  }

  const content = await prisma.facilityContent.upsert({
    where: { facilityId },
    update: { photos: [...photos, publicUrl], updatedBy: owner.userId },
    create: { facilityId, photos: [publicUrl], updatedBy: owner.userId },
  });

  return NextResponse.json({ ok: true, content });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facilityId") ?? "";
  const url = searchParams.get("url") ?? "";
  const owner = await requireFacilityOwner(facilityId);
  if (!owner) return NextResponse.json({ error: "이 시설을 관리할 권한이 없어요." }, { status: 403 });

  const existing = await prisma.facilityContent.findUnique({ where: { facilityId } });
  const photos: string[] = Array.isArray(existing?.photos) ? (existing.photos as string[]) : [];
  if (!photos.includes(url)) {
    return NextResponse.json({ error: "사진을 찾을 수 없어요." }, { status: 404 });
  }

  const content = await prisma.facilityContent.update({
    where: { facilityId },
    data: { photos: photos.filter((p) => p !== url), updatedBy: owner.userId },
  });

  // 스토리지 정리는 실패해도 치명적이지 않다(고아 파일)
  const path = pathFromPublicUrl(BUCKET, url);
  if (path) await deletePublicObject(BUCKET, path);

  return NextResponse.json({ ok: true, content });
}
