import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// 매니저(시터) 알림 설정 — 서버 저장분.
//
// app/mypage/sitter/notifications/page.tsx가 이 API를 부른다. 예전엔 이 페이지가
// localStorage에만 값을 저장해서, 알림을 실제로 보내는 스크립트(scripts/*.mjs)가
// "누가 알림을 켜뒀는지"를 서버 데이터베이스에서 조회할 방법이 없었다. 화면 스위치는
// 켜져 있어도 실제로는 아무도 알림을 못 받는 상태였던 것 — 이 API를 만들어서 해결한다.
//
// 보호자 쪽 관심시설 알림(app/api/favorites/route.ts)과 같은 방식으로 만들었다:
// GET으로 지금 값을 읽고, PATCH로 값을 바꾼다.

// 아직 이 표에 행이 없는 사람(한 번도 설정을 안 바꾼 사람)에게 보여줄 기본값.
// SitterNotificationPref 모델의 @default 값과 반드시 맞춰야 한다 — 여기서만 값을
// 다르게 두면 "처음 화면에서 본 값"과 "실제로 서버에 저장될 값"이 달라져서 혼란스럽다.
const DEFAULT_PREFS = { newJob: true, matchUpdate: true };

/** 로그인한 사람의 알림 설정을 돌려준다. 아직 설정한 적 없으면 기본값을 그대로 준다. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const pref = await prisma.sitterNotificationPref.findUnique({
    where: { userId: session.user.id },
    select: { newJob: true, matchUpdate: true },
  });

  // pref가 null이면 "아직 이 사람의 설정 행이 데이터베이스에 없다"는 뜻이다.
  // 에러가 아니라 정상 상황이므로, 기본값을 그대로 돌려주면 된다.
  return NextResponse.json(pref ?? DEFAULT_PREFS);
}

/** 스위치를 누를 때마다 호출된다. 바뀐 값만 보내면 나머지는 그대로 유지된다. */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const data: { newJob?: boolean; matchUpdate?: boolean } = {};
  if (typeof body.newJob === "boolean") data.newJob = body.newJob;
  if (typeof body.matchUpdate === "boolean") data.matchUpdate = body.matchUpdate;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "바꿀 설정이 없어요." }, { status: 400 });
  }

  // upsert = "있으면 update(수정), 없으면 create(새로 만들기)"를 한 번에 하는 명령.
  // 이 사람이 처음 스위치를 누르는 거라면 아직 행이 없을 수 있으니, 그 경우엔
  // DEFAULT_PREFS 위에 이번에 바뀐 값만 얹어서 새로 만든다.
  const updated = await prisma.sitterNotificationPref.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...DEFAULT_PREFS, ...data },
    update: data,
    select: { newJob: true, matchUpdate: true },
  });

  return NextResponse.json(updated);
}
