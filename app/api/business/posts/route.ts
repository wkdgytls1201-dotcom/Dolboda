import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireFacilityOwner,
  activeSubscriptionsFor,
  capabilityOf,
} from "@/lib/facilityOwner";

// 기업회원 콘솔 — 시설 소식(행사·공지·채용) 작성·삭제.
//
// 소식 발행은 비즈니스 플러스 이상 기능이다. 화면에서 버튼을 잠그는 것과 별개로
// 여기서도 plan을 확인한다(상태를 바꾸는 API에는 가드를 넣는 규칙).
// 무료 시설의 기존 글 "삭제"는 막지 않는다 — 구독이 끝났다고 자기 글을 못 지우게
// 되면 그게 더 이상한 상태다.

const MAX_POSTS = 20;

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  const facilityId = str(body.facilityId, 64);
  const owner = await requireFacilityOwner(facilityId);
  if (!owner) return NextResponse.json({ error: "이 시설을 관리할 권한이 없어요." }, { status: 403 });

  const subs = await activeSubscriptionsFor([facilityId]);
  if (!capabilityOf(subs.get(facilityId) ?? "free").canPostNews) {
    return NextResponse.json(
      { error: "시설 소식은 비즈니스 플러스부터 쓸 수 있어요. 콘솔의 확장 상품 안내를 봐주세요." },
      { status: 403 }
    );
  }

  const title = str(body.title, 80);
  const postBody = str(body.body, 1000);
  if (!title || !postBody) {
    return NextResponse.json({ error: "제목과 내용을 입력해주세요." }, { status: 400 });
  }

  // 무한정 쌓이면 상세 페이지·콘솔 페이로드가 늘어난다 — 오래된 글부터 정리하게 상한을 둔다
  const count = await prisma.facilityPost.count({ where: { facilityId } });
  if (count >= MAX_POSTS) {
    return NextResponse.json(
      { error: `소식은 ${MAX_POSTS}개까지 보관돼요. 오래된 글을 지우고 다시 올려주세요.` },
      { status: 409 }
    );
  }

  const post = await prisma.facilityPost.create({
    data: { facilityId, title, body: postBody, createdBy: owner.userId },
  });
  return NextResponse.json({ ok: true, post });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const facilityId = searchParams.get("facilityId") ?? "";
  const id = searchParams.get("id") ?? "";
  const owner = await requireFacilityOwner(facilityId);
  if (!owner) return NextResponse.json({ error: "이 시설을 관리할 권한이 없어요." }, { status: 403 });

  // 글이 정말 이 시설 것인지 함께 확인 — id만 믿으면 남의 시설 글을 지울 수 있다
  const post = await prisma.facilityPost.findUnique({ where: { id } });
  if (!post || post.facilityId !== facilityId) {
    return NextResponse.json({ error: "소식을 찾을 수 없어요." }, { status: 404 });
  }
  await prisma.facilityPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
