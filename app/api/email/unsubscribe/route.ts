import { NextResponse } from "next/server";
import { addOptOut, verifyUnsubscribeToken } from "@/lib/emailOptOut";
import { SITE_NAME, SITE_URL } from "@/lib/siteConfig";

// 시설 문의 전달 수신거부 처리.
//
// 두 경로를 모두 받는다:
//  - POST: 메일 클라이언트의 원클릭 수신거부(RFC 8058). Gmail이 본문 없이 바로 POST한다.
//  - GET : 사람이 링크를 눌러 브라우저로 들어온 경우. 결과를 화면으로 보여준다.
//
// 로그인은 요구하지 않는다 — 시설 담당자는 우리 서비스 계정이 없다.
// 대신 주소마다 HMAC 서명을 붙여, 링크를 아는 사람만 그 주소를 거부할 수 있게 한다.

function params(req: Request) {
  const { searchParams } = new URL(req.url);
  return {
    email: searchParams.get("e") ?? "",
    token: searchParams.get("t") ?? "",
    facilityId: searchParams.get("f"),
    facilityName: searchParams.get("n"),
  };
}

async function process(req: Request): Promise<{ ok: boolean; email: string }> {
  const { email, token, facilityId, facilityName } = params(req);
  if (!email || !token || !verifyUnsubscribeToken(email, token)) return { ok: false, email };
  await addOptOut({ email, facilityId, facilityName, source: "one-click" });
  return { ok: true, email };
}

export async function POST(req: Request) {
  const { ok } = await process(req);
  // 원클릭은 화면이 없다 — 상태 코드만 정확히 돌려주면 된다
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
}

export async function GET(req: Request) {
  const { ok, email } = await process(req);
  const body = ok
    ? `<h1>수신거부가 완료됐어요</h1>
       <p><strong>${escapeHtml(email)}</strong> 주소로는 앞으로 상담 문의를 전달하지 않습니다.</p>
       <p class="sub">이미 접수된 문의는 ${SITE_NAME} 운영자가 직접 연락드려 처리합니다.</p>`
    : `<h1>처리하지 못했어요</h1>
       <p>링크가 오래되었거나 올바르지 않습니다.</p>
       <p class="sub">메일에 "수신거부"라고 회신해 주시면 직접 처리해 드리겠습니다.</p>`;

  return new NextResponse(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8" />
     <meta name="viewport" content="width=device-width,initial-scale=1" />
     <meta name="robots" content="noindex" />
     <title>수신거부 · ${SITE_NAME}</title>
     <style>
       body{margin:0;background:#FFFBF3;font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic',sans-serif;
            display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;}
       .card{max-width:420px;background:#fff;border-radius:20px;padding:32px 28px;text-align:center;
             box-shadow:0 4px 16px rgba(27,23,48,.06);}
       h1{margin:0 0 12px;font-size:20px;color:#1B1730;}
       p{margin:0 0 8px;font-size:15px;line-height:1.7;color:#5B5470;word-break:keep-all;}
       .sub{font-size:13px;color:#A9A3BC;}
       a{display:inline-block;margin-top:18px;font-size:13px;color:#FF6250;text-decoration:none;}
     </style></head>
     <body><div class="card">${body}<a href="${SITE_URL}">${SITE_NAME} 홈으로</a></div></body></html>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
