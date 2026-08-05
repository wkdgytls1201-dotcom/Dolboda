import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { typeMeta } from "@/lib/careLocationTypes";
import { formatTimeRange } from "@/lib/careOptions";
import {
  AGREEMENT_VERSION,
  agreementDocNo,
  standardClauses,
  type AgreementContent,
} from "@/lib/careAgreement";
import { hashAgreement } from "@/lib/careAgreementHash";
import { resend, agreementCopyEmailHtml } from "@/lib/resend";
import { SITE_URL, SITE_NAME, MAIL_FROM } from "@/lib/siteConfig";

// 돌봄 합의서 — 보호자와 매니저가 직접 맺는 합의의 기록.
// 회사는 당사자가 아니라 양식 제공·기록 보관만 한다(lib/careAgreement.ts 참고).
//
// GET  : 확정된 돌봄 건의 합의서를 가져온다(없으면 초안을 만들어 돌려준다).
// PATCH: 서명. 본인 몫만 서명할 수 있고, 첫 서명 시점에 내용이 봉인된다.

/** 이름 마스킹 — 합의서에도 실명을 그대로 박지 않는다(확인서와 같은 규칙) */
function maskName(name: string | null | undefined): string {
  if (!name) return "미입력";
  if (name.length === 1) return name;
  return name[0] + "*".repeat(name.length - 1);
}

/** 확정된 돌봄 건 + 매칭된 매니저를 가져온다. 보호자·매니저 어느 쪽이든 자기 건만 본다. */
async function findGuardianContext(userId: string) {
  const asGuardian = await prisma.careRequest.findFirst({
    where: { guardianId: userId, status: { in: ["MATCHED", "COMPLETED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      applications: {
        where: { status: { in: ["매칭확정", "돌봄완료"] } },
        include: { sitterProfile: { select: { id: true, nickname: true, experienceYears: true, userId: true } } },
      },
    },
  });
  if (!asGuardian?.applications[0]) return null;
  return { request: asGuardian, application: asGuardian.applications[0], viewer: "guardian" as const };
}

async function findSitterContext(userId: string) {
  const profile = await prisma.sitterProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) return null;
  const app = await prisma.careRequestApplication.findFirst({
    where: { sitterProfileId: profile.id, status: { in: ["매칭확정", "돌봄완료"] } },
    orderBy: { createdAt: "desc" },
    include: {
      sitterProfile: { select: { id: true, nickname: true, experienceYears: true, userId: true } },
      careRequest: true,
    },
  });
  if (!app) return null;
  return { request: app.careRequest, application: app, viewer: "sitter" as const };
}

/**
 * 이 사용자가 지금 다뤄야 할 합의서를 고른다.
 *
 * ⚠️ 예전에는 보호자 쪽을 먼저 찾고 있으면 매니저 쪽은 아예 보지 않았다. 그런데 이 앱은
 * 한 계정이 보호자이자 돌보다 매니저일 수 있다(마이페이지 역할 전환). 그래서 보호자로
 * 서명을 마친 사람이 매니저로 서명하려 하면 계속 보호자 합의서가 잡혀
 * "이미 서명하셨어요"(409)로 막혔다 — 매니저 서명이 영영 불가능했다.
 *
 * 이제 양쪽을 다 조회하고, **아직 내 서명이 비어 있는 쪽**을 우선한다.
 * 둘 다 비었으면 보호자 쪽(요청을 만든 당사자)을 먼저 보여준다.
 */
async function findMatchedContext(userId: string) {
  const [guardianCtx, sitterCtx] = await Promise.all([
    findGuardianContext(userId),
    findSitterContext(userId),
  ]);
  if (!guardianCtx) return sitterCtx;
  if (!sitterCtx) return guardianCtx;

  const [guardianAgreement, sitterAgreement] = await Promise.all([
    prisma.careAgreement.findUnique({
      where: { careRequestId: guardianCtx.request.id },
      select: { guardianSignedAt: true },
    }),
    prisma.careAgreement.findUnique({
      where: { careRequestId: sitterCtx.request.id },
      select: { sitterSignedAt: true },
    }),
  ]);

  const guardianDone = Boolean(guardianAgreement?.guardianSignedAt);
  const sitterDone = Boolean(sitterAgreement?.sitterSignedAt);
  if (guardianDone && !sitterDone) return sitterCtx;
  return guardianCtx;
}

/** 돌봄 요청 데이터 → 합의서 본문 */
function buildContent(
  request: Awaited<ReturnType<typeof findMatchedContext>> extends null
    ? never
    : NonNullable<Awaited<ReturnType<typeof findMatchedContext>>>["request"],
  sitter: { nickname: string; experienceYears: number },
  guardianName: string | null
): AgreementContent {
  const meta = typeMeta(request.locationType);
  const duties = [
    ...(request.householdTasks ?? []),
    ...(request.mobilityLevel ? [`거동 도움(${request.mobilityLevel})`] : []),
    ...(request.mealAssistLevel ? [`식사 도움(${request.mealAssistLevel})`] : []),
    ...(request.toiletAssistLevel ? [`배변 도움(${request.toiletAssistLevel})`] : []),
  ];
  // 성함은 선택 항목이라 비어 있을 수 있다 — 그때 "미입력"을 서류에 박으면
  // 빈칸을 강조하는 꼴이 된다. 아예 빼고 관계·성별·연령대로만 특정한다.
  const recipient = [
    request.recipientName ? maskName(request.recipientName) : null,
    request.recipientRelation,
    request.recipientGender,
    request.recipientAgeBand,
  ]
    .filter(Boolean)
    .join(" · ");

  const terms = {
    locationType: meta.label,
    region: request.region,
    locationNote: request.locationNote,
    startDate: request.startDate.toISOString().slice(0, 10),
    endDate: request.endDate.toISOString().slice(0, 10),
    // 시간이 비어 있으면 "두 분이 정한 시간"으로 — 합의서에 빈칸을 남기지 않는다
    timeRange:
      formatTimeRange(request.roundTheClock, request.startTime, request.endTime) ??
      "두 당사자가 협의한 시간",
    recipient,
    duties,
    payAmount: request.budgetAmount,
    payUnit: request.budgetUnit,
    specialRequests: request.specialRequests ?? [],
    note: request.requestNote,
  };

  return {
    version: AGREEMENT_VERSION,
    issuedAt: new Date().toISOString(),
    parties: {
      guardian: { name: maskName(guardianName), role: "보호자" },
      sitter: {
        name: sitter.nickname,
        role: "돌보다 매니저",
        note: `경력 ${sitter.experienceYears}년`,
      },
    },
    terms,
    clauses: standardClauses(terms),
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const ctx = await findMatchedContext(session.user.id);
  if (!ctx) {
    return NextResponse.json({ error: "확정된 돌봄이 없어요." }, { status: 404 });
  }

  const existing = await prisma.careAgreement.findUnique({
    where: { careRequestId: ctx.request.id },
  });

  if (existing) {
    return NextResponse.json({
      agreement: existing,
      viewer: ctx.viewer,
      // 저장된 내용의 해시를 다시 계산해 봉인이 깨지지 않았는지 확인해준다
      hashValid: hashAgreement(existing.content as unknown as AgreementContent) === existing.contentHash,
    });
  }

  // 아직 없으면 초안만 만들어 보여준다(서명 전까지는 저장하지 않는다 —
  // 요청 내용이 바뀌면 초안도 따라 바뀌어야 하기 때문)
  const guardianUser = await prisma.user.findUnique({
    where: { id: ctx.request.guardianId },
    select: { name: true },
  });
  const content = buildContent(ctx.request, ctx.application.sitterProfile, guardianUser?.name ?? null);

  return NextResponse.json({
    agreement: null,
    draft: content,
    viewer: ctx.viewer,
    applicationId: ctx.application.id,
  });
}

/** 양측 서명이 끝나면 각자에게 사본을 보낸다. 발송 실패가 서명을 되돌리면 안 된다. */
async function sendCopies(agreement: {
  id: string;
  content: unknown;
  contentHash: string;
  createdAt: Date;
  guardianName: string | null;
  guardianEmail: string | null;
  guardianSignedAt: Date | null;
  sitterName: string | null;
  sitterEmail: string | null;
  sitterSignedAt: Date | null;
}) {
  const to = [agreement.guardianEmail, agreement.sitterEmail].filter(
    (e): e is string => Boolean(e)
  );
  // 지역 변수로 잡아둬야 아래 콜백 안에서도 null이 아님이 유지된다
  const mailer = resend;
  if (!mailer || to.length === 0) return false;

  const content = agreement.content as AgreementContent;
  const fmt = (d: Date | null) =>
    d ? `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}. ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "";

  const html = agreementCopyEmailHtml({
    docNo: agreementDocNo(agreement.id, agreement.createdAt.toISOString()),
    contentHash: agreement.contentHash,
    guardianName: agreement.guardianName ?? "",
    guardianSignedAt: fmt(agreement.guardianSignedAt),
    sitterName: agreement.sitterName ?? "",
    sitterSignedAt: fmt(agreement.sitterSignedAt),
    terms: [
      { label: "돌봄 유형", value: content.terms.locationType },
      { label: "기간", value: `${content.terms.startDate} ~ ${content.terms.endDate}` },
      { label: "시간", value: content.terms.timeRange },
      {
        label: "장소",
        value: `${content.terms.region}${content.terms.locationNote ? ` · ${content.terms.locationNote}` : ""}`,
      },
      {
        label: "사례비",
        value:
          content.terms.payAmount != null
            ? `${content.terms.payUnit === "시간" ? "시간당" : "1일"} ${content.terms.payAmount.toLocaleString()}원`
            : "두 분이 별도로 정함",
      },
    ],
    clauses: content.clauses,
    viewUrl: `${SITE_URL}/care-request/agreement`,
  });

  try {
    // 각자에게 따로 보낸다 — 한 통에 묶으면 서로의 이메일 주소가 노출된다
    await Promise.all(
      to.map((addr) =>
        mailer.emails.send({
          from: `${SITE_NAME} 합의서 <${MAIL_FROM}>`,
          to: addr,
          subject: `[${SITE_NAME}] 돌봄 합의서가 완성되었습니다`,
          html,
        })
      )
    );
    return true;
  } catch {
    // 메일이 안 가도 합의서 자체는 유효하다 — 화면에서 원본을 언제든 열 수 있다
    return false;
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: unknown;
    signature?: unknown;
  };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const signature = typeof body.signature === "string" ? body.signature : "";
  if (!name) {
    return NextResponse.json({ error: "서명할 이름을 입력해주세요." }, { status: 400 });
  }
  // dataURL 이미지가 과하게 크면 거부 — 서명 한 장은 보통 수십 KB면 충분하다
  if (signature && (!signature.startsWith("data:image/png;base64,") || signature.length > 400_000)) {
    return NextResponse.json({ error: "서명 이미지를 저장할 수 없어요." }, { status: 400 });
  }

  const ctx = await findMatchedContext(session.user.id);
  if (!ctx) {
    return NextResponse.json({ error: "확정된 돌봄이 없어요." }, { status: 404 });
  }

  const existing = await prisma.careAgreement.findUnique({
    where: { careRequestId: ctx.request.id },
  });

  const now = new Date();
  const isGuardian = ctx.viewer === "guardian";

  // 이미 서명한 쪽이 또 누르는 것은 막는다 — 서명 시각이 덮어써지면 기록의 의미가 없다
  if (existing && (isGuardian ? existing.guardianSignedAt : existing.sitterSignedAt)) {
    return NextResponse.json({ error: "이미 서명하셨어요." }, { status: 409 });
  }

  // 서명 정황 — 나중에 "내가 서명한 적 없다"는 다툼이 생겼을 때 설명할 수 있는 자료.
  // 프록시를 거치므로 원 IP는 x-forwarded-for 첫 값을 쓴다.
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const ua = req.headers.get("user-agent")?.slice(0, 300) ?? null;
  const email = session.user.email ?? null;

  const signData = isGuardian
    ? {
        guardianName: name,
        guardianSignature: signature || null,
        guardianSignedAt: now,
        guardianSignedIp: ip,
        guardianSignedUa: ua,
        guardianEmail: email,
      }
    : {
        sitterName: name,
        sitterSignature: signature || null,
        sitterSignedAt: now,
        sitterSignedIp: ip,
        sitterSignedUa: ua,
        sitterEmail: email,
      };

  if (existing) {
    const updated = await prisma.careAgreement.update({
      where: { id: existing.id },
      data: signData,
    });

    // 이 서명으로 양측이 다 찼으면 사본을 보낸다
    if (updated.guardianSignedAt && updated.sitterSignedAt && !updated.copySentAt) {
      const sent = await sendCopies(updated);
      if (sent) {
        await prisma.careAgreement.update({
          where: { id: updated.id },
          data: { copySentAt: new Date() },
        });
      }
      return NextResponse.json({ agreement: { ...updated, copySentAt: sent ? new Date() : null } });
    }
    return NextResponse.json({ agreement: updated });
  }

  // 첫 서명 — 이 시점의 내용을 봉인한다(이후 원본 요청이 바뀌어도 합의서는 그대로)
  const guardianUser = await prisma.user.findUnique({
    where: { id: ctx.request.guardianId },
    select: { name: true },
  });
  const content = buildContent(ctx.request, ctx.application.sitterProfile, guardianUser?.name ?? null);
  const contentHash = hashAgreement(content);

  let created;
  try {
    created = await prisma.careAgreement.create({
      data: {
        careRequestId: ctx.request.id,
        applicationId: ctx.application.id,
        guardianId: ctx.request.guardianId,
        sitterProfileId: ctx.application.sitterProfile.id,
        content: content as unknown as object,
        contentHash,
        ...signData,
      },
    });
  } catch {
    // 보호자·매니저가 거의 동시에 첫 서명을 누르면 둘 다 "합의서 없음"을 보고 create를
    // 시도한다 — careRequestId unique에 막힌 쪽이 500으로 죽는 대신, 새로고침해서
    // 상대가 만든 합의서 위에 자기 서명을 얹도록 안내한다(내용 봉인은 먼저 만든 쪽 기준).
    return NextResponse.json(
      { error: "동시에 서명이 진행됐어요. 화면을 새로고침한 뒤 다시 서명해주세요." },
      { status: 409 }
    );
  }
  return NextResponse.json({ agreement: created });
}
