import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { REGIONS } from "@/lib/regions";

// 돌봄 요청(lib/careRequestValidation.ts)은 길이·화이트리스트를 촘촘히 거르는데
// 매니저 프로필만 아무 제한이 없었다. 닉네임 10만 자, 경력 9999년, 활동지역 1000개가
// 그대로 들어갈 수 있었고 regions는 스키마 주석의 "최대 10개"도 서버에서 안 봤다.
const MAX_NICKNAME = 20;
const MAX_INTRO = 200; // 화면 글자수 카운터와 같은 값
const MAX_REGIONS = 10;
const MAX_EXPERIENCE_YEARS = 60;
const MAX_BANK_FIELD = 40;
const MAX_CERT_NAME = 50;
const MAX_CERTIFICATIONS = 20;
const NATIONALITIES = ["내국인", "외국인"];
// 역경매 지원자 카드용(선택 항목) — 밴드형만 받는다(정확한 나이·주민번호류는 안 받는다)
const GENDERS = ["여성", "남성"];
const AGE_BANDS = ["20대", "30대", "40대", "50대", "60대", "70대 이상"];

function text(v: unknown, maxLen: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t.slice(0, maxLen) : null;
}

/** 활동 지역은 lib/regions.ts의 값만 받는다 — 임의 문자열은 일자리 매칭에서 영영 안 걸린다 */
function cleanRegions(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const allowed = new Set<string>(REGIONS);
  const out = [...new Set(v.filter((r): r is string => typeof r === "string" && allowed.has(r)))];
  return out.slice(0, MAX_REGIONS);
}

function cleanExperience(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.min(Math.max(Math.round(v), 0), MAX_EXPERIENCE_YEARS);
}

/** 프로필 사진은 <img src>로 그대로 들어간다 — http(s)만 받는다 */
function cleanPhotoUrl(v: unknown): string | null {
  const raw = text(v, 500);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? raw : null;
  } catch {
    return null;
  }
}

function cleanCertifications(v: unknown): { name: string; issuedBy?: string }[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((c) => {
      const name = text((c as { name?: unknown })?.name, MAX_CERT_NAME);
      if (!name) return null;
      const issuedBy = text((c as { issuedBy?: unknown })?.issuedBy, MAX_CERT_NAME);
      return { name, ...(issuedBy ? { issuedBy } : {}) };
    })
    .filter((c): c is { name: string; issuedBy?: string } => c !== null)
    .slice(0, MAX_CERTIFICATIONS);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const profile = await prisma.sitterProfile.findUnique({
    where: { userId: session.user.id },
    include: { certifications: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "등록된 돌보다 매니저 프로필이 없어요." }, { status: 404 });
  }

  return NextResponse.json(profile);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const existing = await prisma.sitterProfile.findUnique({ where: { userId: session.user.id } });
  if (existing) {
    return NextResponse.json({ error: "이미 등록된 돌보다 매니저 프로필이 있어요." }, { status: 409 });
  }

  const body = await req.json();
  const {
    nickname,
    photoUrl,
    nationality,
    intro,
    experienceYears,
    regions,
    bankName,
    bankAccountNumber,
    bankAccountHolder,
    marketingOptIn,
    certifications,
    gender,
    ageBand,
  } = body as {
    nickname?: string;
    photoUrl?: string;
    nationality?: string;
    intro?: string;
    experienceYears?: number;
    regions?: string[];
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountHolder?: string;
    marketingOptIn?: boolean;
    certifications?: { name: string; issuedBy?: string }[];
    gender?: string | null;
    ageBand?: string | null;
  };

  const cleanNickname = text(nickname, MAX_NICKNAME);
  const cleanRegionList = cleanRegions(regions);
  if (
    !cleanNickname ||
    !nationality ||
    !NATIONALITIES.includes(nationality) ||
    !cleanRegionList ||
    cleanRegionList.length === 0
  ) {
    return NextResponse.json({ error: "필수 항목이 누락됐어요." }, { status: 400 });
  }

  const certList = cleanCertifications(certifications);

  const profile = await prisma.sitterProfile.create({
    data: {
      userId: session.user.id,
      nickname: cleanNickname,
      photoUrl: cleanPhotoUrl(photoUrl),
      nationality,
      intro: text(intro, MAX_INTRO),
      experienceYears: cleanExperience(experienceYears) ?? 0,
      regions: cleanRegionList,
      bankName: text(bankName, MAX_BANK_FIELD),
      bankAccountNumber: text(bankAccountNumber, MAX_BANK_FIELD),
      bankAccountHolder: text(bankAccountHolder, MAX_BANK_FIELD),
      marketingOptIn: marketingOptIn === true,
      // 선택 항목 — PATCH와 같은 화이트리스트만 통과시키고, 밖의 값은 조용히 버린다
      // (등록을 400으로 막을 만큼 중요한 값이 아니다)
      gender: typeof gender === "string" && GENDERS.includes(gender) ? gender : null,
      ageBand: typeof ageBand === "string" && AGE_BANDS.includes(ageBand) ? ageBand : null,
      agreedAt: new Date(),
      certifications: certList.length ? { create: certList } : undefined,
    },
    include: { certifications: true },
  });

  return NextResponse.json(profile, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const existing = await prisma.sitterProfile.findUnique({ where: { userId: session.user.id } });
  if (!existing) {
    return NextResponse.json({ error: "등록된 돌보다 매니저 프로필이 없어요." }, { status: 404 });
  }

  const body = await req.json();
  const {
    nickname,
    photoUrl,
    nationality,
    intro,
    experienceYears,
    regions,
    bankName,
    bankAccountNumber,
    bankAccountHolder,
    marketingOptIn,
    publicProfile,
    gender,
    ageBand,
  } = body as Partial<{
    nickname: string;
    photoUrl: string | null;
    nationality: string;
    intro: string | null;
    experienceYears: number;
    regions: string[];
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountHolder: string | null;
    marketingOptIn: boolean;
    publicProfile: boolean;
    gender: string | null;
    ageBand: string | null;
  }>;

  if (gender !== undefined && gender !== null && !GENDERS.includes(gender)) {
    return NextResponse.json({ error: "성별 값이 올바르지 않아요." }, { status: 400 });
  }
  if (ageBand !== undefined && ageBand !== null && !AGE_BANDS.includes(ageBand)) {
    return NextResponse.json({ error: "연령대 값이 올바르지 않아요." }, { status: 400 });
  }

  // 닉네임·활동지역은 값이 왔는데 통째로 걸러지면(빈 문자열, 목록에 없는 지역) 조용히
  // 지워버리는 대신 오류로 알린다 — 이 둘은 없으면 매칭 자체가 안 되는 필수값이다.
  if (nickname !== undefined && !text(nickname, MAX_NICKNAME)) {
    return NextResponse.json({ error: "활동명을 입력해주세요." }, { status: 400 });
  }
  let nextRegions: string[] | undefined;
  if (regions !== undefined) {
    const cleaned = cleanRegions(regions);
    if (!cleaned || cleaned.length === 0) {
      return NextResponse.json({ error: "활동 지역을 1곳 이상 골라주세요." }, { status: 400 });
    }
    nextRegions = cleaned;
  }
  if (nationality !== undefined && !NATIONALITIES.includes(nationality)) {
    return NextResponse.json({ error: "국적 값이 올바르지 않아요." }, { status: 400 });
  }

  const profile = await prisma.sitterProfile.update({
    where: { userId: session.user.id },
    data: {
      ...(nickname !== undefined && { nickname: text(nickname, MAX_NICKNAME)! }),
      // photoUrl·intro·계좌는 null을 보내 지우는 게 정상 동작이라 null을 그대로 통과시킨다
      ...(photoUrl !== undefined && { photoUrl: cleanPhotoUrl(photoUrl) }),
      ...(nationality !== undefined && { nationality }),
      ...(intro !== undefined && { intro: text(intro, MAX_INTRO) }),
      ...(experienceYears !== undefined && {
        experienceYears: cleanExperience(experienceYears) ?? 0,
      }),
      ...(nextRegions !== undefined && { regions: nextRegions }),
      ...(bankName !== undefined && { bankName: text(bankName, MAX_BANK_FIELD) }),
      ...(bankAccountNumber !== undefined && {
        bankAccountNumber: text(bankAccountNumber, MAX_BANK_FIELD),
      }),
      ...(bankAccountHolder !== undefined && {
        bankAccountHolder: text(bankAccountHolder, MAX_BANK_FIELD),
      }),
      ...(marketingOptIn !== undefined && { marketingOptIn: marketingOptIn === true }),
      // 공개 프로필 옵트인 — 켠 "시각"을 남긴다(공개 동의의 근거). 끄면 즉시 null,
      // 이미 켜져 있는데 또 true가 오면 최초 동의 시각을 보존한다.
      ...(publicProfile !== undefined && {
        publicProfileAt:
          publicProfile === true ? (existing.publicProfileAt ?? new Date()) : null,
      }),
      // 성별·연령대는 null로 지울 수 있다(선택 항목)
      ...(gender !== undefined && { gender }),
      ...(ageBand !== undefined && { ageBand }),
    },
    include: { certifications: true },
  });

  return NextResponse.json(profile);
}
