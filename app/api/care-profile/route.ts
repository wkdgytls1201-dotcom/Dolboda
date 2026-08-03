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

// 요양인정번호는 화이트리스트가 있는 값이 아니라 자유 입력이다 — 정확한 자릿수 규격을
// 공식 확인하지 않았으므로 자릿수를 강제하지 않고, 숫자·하이픈만 허용해 형식만 거른다
// (자유 텍스트가 그대로 들어가 다른 정보가 섞이는 것만 막는다).
function pickCertNumber(v: unknown): string | null | undefined {
  if (v === null) return null; // 명시적으로 지우는 요청
  if (typeof v !== "string") return undefined; // 안 보낸 필드는 건드리지 않는다
  const trimmed = v.trim();
  if (!trimmed) return null;
  if (!/^[0-9-]{4,20}$/.test(trimmed)) return undefined;
  return trimmed;
}

/**
 * 본문에서 프로필 필드를 화이트리스트로 걸러낸다. 어긋난 값은 조용히 null 처리하되,
 * **body에 그 키가 아예 없으면 결과에도 포함하지 않는다.**
 *
 * 전체 폼(보호자 프로필 만들기·수정)은 항상 모든 키를 채워 보내므로 예전과 동작이
 * 같다. 다만 복지용구 혜택 화면처럼 `{id, ltcCertNumber}`만 보내는 부분 업데이트가
 * 생기면서, "안 보낸 필드 = null로 지운다"는 기존 규칙이 그 요청에도 적용돼 프로필의
 * 나머지 값(성별·거동 수준 등)이 전부 지워지는 문제가 있었다 — 그래서 "키가 있는지"를
 * 먼저 보고, 있을 때만 pick()으로 검증한다.
 */
function cleanFields(body: Record<string, unknown>) {
  const out: Record<string, string | string[] | null> = {};
  const setIfPresent = (key: string, allowed: readonly string[]) => {
    if (key in body) out[key] = pick(body[key], allowed);
  };
  setIfPresent("gender", RECIPIENT_GENDERS);
  setIfPresent("ageBand", AGE_BANDS);
  setIfPresent("weightBand", WEIGHT_BANDS);
  setIfPresent("mobilityLevel", MOBILITY_LEVELS);
  setIfPresent("mealAssistLevel", MEAL_ASSIST_LEVELS);
  setIfPresent("toiletAssistLevel", TOILET_ASSIST_LEVELS);
  setIfPresent("ltcGrade", LTC_GRADE_OPTIONS);
  if ("conditions" in body) out.conditions = pickConditions(body.conditions);
  // 날짜 두 개는 화이트리스트가 없는 자유 입력이라 형식(YYYY-MM-DD)과 실재하는 날짜인지만 본다
  if ("birthDate" in body) out.birthDate = pickDate(body.birthDate);
  if ("ltcCertValidFrom" in body) out.ltcCertValidFrom = pickDate(body.ltcCertValidFrom);
  return out;
}

/**
 * YYYY-MM-DD 형식이면서 실제로 존재하는 날짜만 통과시킨다.
 * 형식만 보면 2026-02-31 같은 값이 그대로 저장돼 나중에 화면에서 깨진다.
 */
function pickDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null;
  // 미래 생년월일이나 200년 전 같은 값은 오타로 본다
  const year = Number(s.slice(0, 4));
  if (year < 1900 || year > new Date().getFullYear() + 10) return null;
  return s;
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
      { error: `보호자 프로필은 최대 ${MAX_PROFILES}개까지 만들 수 있어요.` },
      { status: 400 }
    );
  }

  // 등급테스트에서 바로 넘어온 경우 추정 구간도 함께 저장 (밴드 id 화이트리스트)
  const estimatedBand =
    typeof body.estimatedBand === "string" &&
    GRADE_BANDS.some((b) => b.id === body.estimatedBand)
      ? body.estimatedBand
      : null;

  const ltcCertNumber = pickCertNumber(body.ltcCertNumber);

  const profile = await prisma.careProfile.create({
    data: {
      userId: session.user.id,
      relation,
      ...cleanFields(body),
      ...(estimatedBand ? { estimatedBand, estimatedAt: new Date() } : {}),
      ...(ltcCertNumber !== undefined ? { ltcCertNumber } : {}),
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
  const ltcCertNumber = pickCertNumber(body.ltcCertNumber);

  const profile = await prisma.careProfile.update({
    where: { id },
    data: {
      ...(relation && { relation }),
      ...cleanFields(body),
      // 요양인정번호만 등록하는 화면(복지용구 혜택)은 나머지 프로필 필드를 안 보낸다 —
      // 이 필드만 따로 다뤄야 그 화면이 나머지 값을 null로 밀어버리지 않는다
      ...(ltcCertNumber !== undefined ? { ltcCertNumber } : {}),
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
