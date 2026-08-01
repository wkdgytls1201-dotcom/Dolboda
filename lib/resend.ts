import { Resend } from "resend";
import { SITE_URL, SITE_NAME } from "./siteConfig";

// RESEND_API_KEY 없으면(로컬 개발 등) 이메일 발송만 건너뛰고 DB 저장은 그대로 진행한다.
export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const CONSULT_NOTIFY_EMAIL = "wkdgytls1201@gmail.com";

// 시설에 보내는 상담신청 전달 메일 — 여기는 "거래·서비스성 정보"만 담는다.
// (실제 이용자가 남긴 문의를 그대로 전달하는 것) 광고성 문구·프로모션은 절대 섞지 않는다 —
// 정보통신망법상 영리목적 광고성 정보는 사전 동의가 필요한데, 이 이메일 주소들은
// 공단이 행정 목적으로 공개한 것이지 마케팅 수신에 동의한 주소가 아니다.
// 로고·슬로건과 "왜 이 메일을 받았는지" 설명을 넣어 신뢰를 주되, 내용은 항상 문의 건 전달로 한정한다.
export function consultForwardEmailHtml(params: {
  facilityName: string;
  requesterName: string;
  requesterPhone: string;
  receivedAt: string;
  profileLines?: string;
}): string {
  const { facilityName, requesterName, requesterPhone, receivedAt, profileLines } = params;
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `
<!doctype html>
<html lang="ko">
  <body style="margin:0;padding:0;background:#FFFBF3;font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic',sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBF3;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 16px rgba(27,23,48,0.06);">
            <tr>
              <td style="padding:28px 28px 20px;text-align:center;background:linear-gradient(135deg,#FF6250,#FF9F8C);">
                <img src="${SITE_URL}/logo.png" alt="${SITE_NAME}" width="40" height="40" style="border-radius:10px;display:block;margin:0 auto 10px;" />
                <p style="margin:0;color:#ffffff;font-size:20px;font-weight:800;">${SITE_NAME}</p>
                <p style="margin:4px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">정보 비대칭 없는 투명한 돌봄</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#1B1730;">
                  ${esc(facilityName)} 담당자님, 상담 문의가 도착했어요
                </p>
                <p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#6B647F;">
                  ${SITE_NAME}는 전국 요양시설의 공공데이터(평가등급·인력현황·비급여비용 등)를
                  비교해 보여드리는 서비스예요. 귀 시설 정보를 보신 이용자가 아래와 같이
                  상담을 신청해 안내드립니다.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF7E9;border-radius:14px;">
                  <tr><td style="padding:16px 18px;">
                    <p style="margin:0 0 8px;font-size:14px;color:#1B1730;"><strong>문의자</strong> · ${esc(requesterName)}</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#1B1730;"><strong>연락처</strong> · ${esc(requesterPhone)}</p>
                    <p style="margin:0;font-size:12px;color:#A9A3BC;">접수 ${esc(receivedAt)}</p>
                    ${
                      profileLines
                        ? `<hr style="border:none;border-top:1px solid #FFE3CC;margin:12px 0;" />
                           <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#6B647F;">문의자가 전달에 동의한 어르신 정보</p>
                           <p style="margin:0;font-size:13px;line-height:1.7;color:#3A3452;white-space:pre-line;">${esc(profileLines)}</p>`
                        : ""
                    }
                  </td></tr>
                </table>

                <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#6B647F;">
                  문의자에게 직접 연락해 상담을 진행해 주세요.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background:#F7F5FB;text-align:center;">
                <p style="margin:0;font-size:11px;line-height:1.6;color:#A9A3BC;">
                  이 메일은 ${SITE_NAME} 이용자가 귀 시설에 남긴 상담 신청을 전달하는
                  안내 메일이며, 광고성 정보가 아니에요.<br />
                  문의사항은 <a href="${SITE_URL}/about" style="color:#FF6250;">${SITE_URL}/about</a>
                  에서 확인하실 수 있어요.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
