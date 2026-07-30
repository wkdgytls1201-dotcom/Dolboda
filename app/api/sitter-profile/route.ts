import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
    return NextResponse.json({ error: "등록된 모심시터 프로필이 없어요." }, { status: 404 });
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
    return NextResponse.json({ error: "이미 등록된 모심시터 프로필이 있어요." }, { status: 409 });
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
  };

  if (!nickname || !nationality || !Array.isArray(regions) || regions.length === 0) {
    return NextResponse.json({ error: "필수 항목이 누락됐어요." }, { status: 400 });
  }

  const profile = await prisma.sitterProfile.create({
    data: {
      userId: session.user.id,
      nickname,
      photoUrl,
      nationality,
      intro,
      experienceYears: experienceYears ?? 0,
      regions,
      bankName,
      bankAccountNumber,
      bankAccountHolder,
      marketingOptIn: marketingOptIn ?? false,
      agreedAt: new Date(),
      certifications: certifications?.length
        ? { create: certifications.map((c) => ({ name: c.name, issuedBy: c.issuedBy })) }
        : undefined,
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
    return NextResponse.json({ error: "등록된 모심시터 프로필이 없어요." }, { status: 404 });
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
  }>;

  const profile = await prisma.sitterProfile.update({
    where: { userId: session.user.id },
    data: {
      ...(nickname !== undefined && { nickname }),
      ...(photoUrl !== undefined && { photoUrl }),
      ...(nationality !== undefined && { nationality }),
      ...(intro !== undefined && { intro }),
      ...(experienceYears !== undefined && { experienceYears }),
      ...(regions !== undefined && { regions }),
      ...(bankName !== undefined && { bankName }),
      ...(bankAccountNumber !== undefined && { bankAccountNumber }),
      ...(bankAccountHolder !== undefined && { bankAccountHolder }),
      ...(marketingOptIn !== undefined && { marketingOptIn }),
    },
    include: { certifications: true },
  });

  return NextResponse.json(profile);
}
