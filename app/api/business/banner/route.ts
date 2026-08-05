import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireFacilityOwner,
  activeSubscriptionsFor,
  capabilityOf,
} from "@/lib/facilityOwner";
import { BANNER_SLOTS_PER_SIGUNGU } from "@/lib/businessPlans";
import {
  deletePublicObject,
  isStorageConfigured,
  pathFromPublicUrl,
  uploadPublicObject,
} from "@/lib/supabaseStorage";

// 기업회원 콘솔 — 지역 배너 업로드/삭제 (지역 프리미엄 이상).
//
// FacilityBanner 행은 보통 /admin 승인 시점에 이미 만들어져 있다(스폰서와 같은 지역
// 슬롯 예약 방식). 여기서는 그 행에 이미지를 채우거나 지운다.
// 승인 전에 요금제가 바뀐 옛 계정을 위해 행이 없으면 그 자리에서 만든다(자가 치유) —
// 이때는 슬롯이 남아 있는지 새로 확인해야 한다.

const BUCKET = "facility-banners";
const MAX_BYTES = 800 * 1024; // 배너는 가로가 넓어 시설 사진(900KB)과 비슷하게 여유를 둔다
const ALLOWED = new Set(["image/webp", "image/jpeg", "image/png"]);

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facilityId") ?? "";
  const owner = await requireFacilityOwner(facilityId);
  if (!owner) return NextResponse.json({ error: "이 시설을 관리할 권한이 없어요." }, { status: 403 });

  const subs = await activeSubscriptionsFor([facilityId]);
  const plan = subs.get(facilityId) ?? "free";
  if (!capabilityOf(plan).hasBanner) {
    return NextResponse.json(
      { error: "지역 배너는 지역 프리미엄부터 쓸 수 있어요. 콘솔의 확장 상품 안내를 봐주세요." },
      { status: 403 }
    );
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
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) {
    return NextResponse.json({ error: "이미지 용량이 너무 커요." }, { status: 413 });
  }

  let banner = await prisma.facilityBanner.findUnique({ where: { facilityId } });
  if (!banner) {
    // 자가 치유: 정상 경로(관리자 승인)에서는 이미 있어야 하는 행이 없다 —
    // 요금제 변경 등으로 어긋난 경우, 시설의 스폰서 지역을 그대로 재사용해 새로 만든다.
    const placement = await prisma.sponsorPlacement.findFirst({
      where: { facilityId, scope: "sigungu" },
    });
    const regionKey = placement?.regionKey ?? "";
    if (!regionKey) {
      return NextResponse.json(
        { error: "배너 지역이 아직 지정되지 않았어요. 운영자에게 문의해주세요." },
        { status: 409 }
      );
    }
    const used = await prisma.facilityBanner.count({ where: { regionKey, active: true } });
    if (used >= BANNER_SLOTS_PER_SIGUNGU) {
      return NextResponse.json(
        { error: `${regionKey}의 배너 자리가 이미 찼어요. 운영자에게 문의해주세요.` },
        { status: 409 }
      );
    }
    banner = await prisma.facilityBanner.create({ data: { facilityId, regionKey } });
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
    console.error("배너 업로드 실패:", e);
    return NextResponse.json({ error: "이미지를 저장하지 못했어요." }, { status: 502 });
  }

  const oldPath = pathFromPublicUrl(BUCKET, banner.imageUrl);
  const updated = await prisma.facilityBanner.update({
    where: { facilityId },
    data: { imageUrl: publicUrl },
  });
  if (oldPath) await deletePublicObject(BUCKET, oldPath);

  return NextResponse.json({ ok: true, banner: updated });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facilityId") ?? "";
  const owner = await requireFacilityOwner(facilityId);
  if (!owner) return NextResponse.json({ error: "이 시설을 관리할 권한이 없어요." }, { status: 403 });

  const banner = await prisma.facilityBanner.findUnique({ where: { facilityId } });
  if (!banner || !banner.imageUrl) {
    return NextResponse.json({ error: "등록된 배너가 없어요." }, { status: 404 });
  }

  const path = pathFromPublicUrl(BUCKET, banner.imageUrl);
  const updated = await prisma.facilityBanner.update({
    where: { facilityId },
    data: { imageUrl: null },
  });
  if (path) await deletePublicObject(BUCKET, path);

  return NextResponse.json({ ok: true, banner: updated });
}
