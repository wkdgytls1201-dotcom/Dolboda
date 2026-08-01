import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GRADE_BANDS } from "@/lib/gradeTest";
import {
  RECIPIENT_RELATIONS,
  RECIPIENT_GENDERS,
  AGE_BANDS,
  WEIGHT_BANDS,
  MOBILITY_LEVELS,
  MEAL_ASSIST_LEVELS,
  TOILET_ASSIST_LEVELS,
  LTC_GRADE_OPTIONS,
  CONDITION_SUGGESTIONS,
} from "@/lib/careOptions";

// 어르신 돌봄 프로필 — 건강 상태(민감정보)를 다루므로 원칙을 코드로 강제한다:
//  1) 모든 값은 화면 선택지의 화이트리스트만 통과 (자유 텍스트 없음 → 상세 병력이 못 들어옴)
//  2) consent: true 없이는 생성 자체가 안 됨 (consentAt 필수 컬럼)
//  3) 이름·생년월일 필드 자체가 없음 — 호칭(relation)이 이름을 대신한다
//  4) 본인 것만 조회·수정·삭제 가능

// 한 계정에 어르신 여러 분(부모님 두 분 등)을 둘 수 있되 상한을 둔다
const MAX_PROFILES = 3;

function pick(v: unknown, allowed: readonly string[]): string | null {
  return typeof v === "string" && allowed.includes(v) ? v : null;
}

function pickConditions(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const allowed = new Set<string>(CONDITION_SUGGESTIONS);
  return [...new Set(v.filter((c): c is string => typeof c === "string" && allowed.has(c)))];
}

/** 본문에서 프로필 필드를 화이트리스트로 걸러낸다. 어긋난 값은 조용히 null 처리. */
function cleanFields(body: Record<string, unknown>) {
  return {
    gender: pick(body.gender, RECIPIENT_GENDERS),
    ageBand: pick(body.ageBand, AGE_BANDS),
    weightBand: pick(body.weightBand, WEIGHT_BANDS),
    mobilityLevel: pick(body.mobilityLevel, MOBILITY_LEVELS),
    mealAssistLevel: pick(body.mealAssistLevel, MEAL_ASSIST_LEVELS),
    toiletAssistLevel: pick(body.toiletAssistLevel, TOILET_ASSIST_LEVELS),
    ltcGrade: pick(body.ltcGrade, LTC_GRADE_OPTIONS),
    conditions: pickConditions(body.conditions),
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  const items = await prisma.careProfile.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const relation = pick(body.relation, RECIPIENT_RELATIONS);
  if (!relation) {
    return NextResponse.json({ error: "어르신과의 관계를 골라주세요." }, { status: 400 });
  }
  // 민감정보 동의는 매번 명시적으로 — 프론트 기본 체크 상태를 신뢰하지 않는다
  if (body.consent !== true) {
    return NextResponse.json(
      { error: "건강 정보 저장에 대한 동의가 필요해요." },
      { status: 400 }
    );
  }

  const count = await prisma.careProfile.count({ where: { userId: session.user.id } });
  if (count >= MAX_PROFILES) {
    return NextResponse.json(
      { error: `돌봄 프로필은 최대 ${MAX_PROFILES}개까지 만들 수 있어요.` },
      { status: 400 }
    );
  }

  // 등급테스트에서 바로 넘어온 경우 추정 구간도 함께 저장 (밴드 id 화이트리스트)
  const estimatedBand =
    typeof body.estimatedBand === "string" &&
    GRADE_BANDS.some((b) => b.id === body.estimatedBand)
      ? body.estimatedBand
      : null;

  const profile = await prisma.careProfile.create({
    data: {
      userId: session.user.id,
      relation,
      ...cleanFields(body),
      ...(estimatedBand ? { estimatedBand, estimatedAt: new Date() } : {}),
      consentAt: new Date(),
    },
  });
  return NextResponse.json(profile, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : "";
  const existing = id
    ? await prisma.careProfile.findUnique({ where: { id }, select: { userId: true } })
    : null;
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "수정할 수 없어요." }, { status: 404 });
  }

  const relation = pick(body.relation, RECIPIENT_RELATIONS);

  const profile = await prisma.careProfile.update({
    where: { id },
    data: {
      ...(relation && { relation }),
      ...cleanFields(body),
      // 등급테스트 추정 구간 반영 — 테스트가 실제로 내놓는 밴드 id만 받는다.
      // (자유 문자열을 받으면 "1등급 확정" 같은 임의 주장이 저장될 수 있다)
      ...(typeof body.estimatedBand === "string" &&
      GRADE_BANDS.some((b) => b.id === body.estimatedBand)
        ? { estimatedBand: body.estimatedBand, estimatedAt: new Date() }
        : body.estimatedBand === null
        ? { estimatedBand: null, estimatedAt: null }
        : {}),
    },
  });
  return NextResponse.json(profile);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  const existing = id
    ? await prisma.careProfile.findUnique({ where: { id }, select: { userId: true } })
    : null;
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "삭제할 수 없어요." }, { status: 404 });
  }
  await prisma.careProfile.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
