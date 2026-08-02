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
            <!-- 헤더 — 메일 클라이언트는 CSS를 많이 걷어낸다. 그라데이션이 지워져도
                 괜찮도록 bgcolor로 코랄 단색 바탕을 깔고 그 위에 그라데이션을 얹는다.
                 로고가 코랄색 꽃이라 코랄 배경에 그냥 두면 묻힌다 → 흰 원 위에 올린다. -->
            <tr>
              <td bgcolor="#FF6250" style="padding:32px 28px 26px;text-align:center;background:#FF6250;background-image:linear-gradient(135deg,#FF6250 0%,#FF8A73 55%,#FFB48C 100%);">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 14px;">
                  <tr>
                    <td bgcolor="#FFFFFF" width="92" height="92" align="center" valign="middle" style="width:92px;height:92px;background:#ffffff;border-radius:46px;text-align:center;vertical-align:middle;">
                      <a href="${SITE_URL}" style="text-decoration:none;display:block;">
                        <img src="${SITE_URL}/logo.png" alt="${SITE_NAME}" width="60" height="60" style="display:block;margin:0 auto;border:0;" />
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.4px;">${SITE_NAME}</p>
                <!-- 태그라인은 알약 배경으로 — 흰 글씨만 두면 그라데이션 밝은 쪽에서 흐릿해진다 -->
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:10px auto 0;">
                  <tr>
                    <td bgcolor="#E8442F" style="padding:6px 14px;background:#E8442F;border-radius:999px;">
                      <span style="color:#ffffff;font-size:13px;font-weight:600;letter-spacing:-0.2px;">정보 비대칭 없는 투명한 돌봄</span>
                    </td>
                  </tr>
                </table>
                <p style="margin:12px 0 0;font-size:12px;letter-spacing:0.2px;">
                  <a href="${SITE_URL}" style="color:#FFEDE8;text-decoration:underline;">
                    ${SITE_URL.replace(/^https?:\/\//, "")}
                  </a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1B1730;">
                  ${esc(facilityName)} 담당자님, 상담 문의가 도착했어요
                </p>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#6B647F;">
                  귀 시설 정보를 보신 이용자가 아래와 같이 상담을 신청해 안내드립니다.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF7E9;border-radius:14px;">
                  <tr><td style="padding:18px 20px;">
                    <p style="margin:0 0 9px;font-size:16px;color:#1B1730;"><strong>문의자</strong> · ${esc(requesterName)}</p>
                    <p style="margin:0 0 9px;font-size:16px;color:#1B1730;"><strong>연락처</strong> · ${esc(requesterPhone)}</p>
                    <p style="margin:0;font-size:13px;color:#A9A3BC;">접수 ${esc(receivedAt)}</p>
                    ${
                      profileLines
                        ? `<hr style="border:none;border-top:1px solid #FFE3CC;margin:13px 0;" />
                           <p style="margin:0 0 5px;font-size:13px;font-weight:700;color:#6B647F;">문의자가 전달에 동의한 어르신 정보</p>
                           <p style="margin:0;font-size:14px;line-height:1.75;color:#3A3452;white-space:pre-line;">${esc(profileLines)}</p>`
                        : ""
                    }
                  </td></tr>
                </table>

                <p style="margin:20px 0 0;font-size:14px;line-height:1.7;color:#6B647F;">
                  문의자가 상담을 하길 원해요.
                </p>

                <hr style="border:none;border-top:1px solid #EFECF6;margin:22px 0 18px;" />

                <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1B1730;">
                  ${SITE_NAME}는 어떤 서비스인가요
                </p>
                <p style="margin:0 0 12px;font-size:14px;line-height:1.85;color:#5B5470;">
                  ${SITE_NAME}는 <strong>고령화 시대의 돌봄 정보 격차를 해소하는 시니어 케어
                  플랫폼</strong>입니다.
                </p>
                <p style="margin:0 0 12px;font-size:14px;line-height:1.85;color:#5B5470;">
                  노인 돌봄 시장은 빠르게 성장하고 있지만, 보호자가 믿을 수 있는 요양시설과 돌봄
                  서비스를 찾는 과정은 여전히 어렵고 복잡합니다. 시설마다 안내하는 정보의 기준이
                  다르고, 실제 서비스의 내용이나 비용을 객관적으로 비교하기도 쉽지 않습니다.
                </p>
                <p style="margin:0 0 12px;font-size:14px;line-height:1.85;color:#5B5470;">
                  ${SITE_NAME}는 이러한 <strong>돌봄 시장의 정보 비대칭을 해소하고, 보호자의
                  합리적인 의사결정을 돕기 위해</strong> 만들어졌습니다.
                  <strong>국민건강보험공단</strong>·<strong>건강보험심사평가원</strong>이 공개한
                  자료를 바탕으로 전국 요양시설 <strong>28,000여 곳</strong>의 위치·비용·인력 현황·
                  평가 정보·제공 서비스를 한곳에 모아, 보호자가 쉽고 투명하게 확인할 수 있도록
                  제공합니다.
                </p>
                <p style="margin:0 0 18px;font-size:14px;line-height:1.85;color:#5B5470;">
                  어느 시설을 선택할지는 보호자와 시설이 직접 상담해 정하시며, ${SITE_NAME}는
                  그 사이에 개입하거나 순위를 임의로 바꾸지 않습니다.
                </p>

                <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1B1730;">
                  혹시 정보가 실제와 다르다면
                </p>
                <p style="margin:0 0 18px;font-size:14px;line-height:1.85;color:#5B5470;">
                  공공데이터를 기준으로 하다 보니 갱신 시점에 따라 현황과 차이가 생길 수 있습니다.
                  귀 시설을 찾는 보호자에게 정확한 정보가 닿는 일이 무엇보다 중요하기에,
                  바로잡을 내용이 있으시면 <strong>이 메일에 회신</strong>해 주십시오.
                  확인 후 신속히 반영하겠습니다.
                </p>

                <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1B1730;">
                  문의 전달을 원하지 않으시면
                </p>
                <p style="margin:0;font-size:14px;line-height:1.85;color:#5B5470;">
                  <strong>“수신거부”</strong>라고 회신해 주시면 이후 귀 시설로는 문의를 전달하지
                  않습니다. 번거롭게 해 드리지 않겠습니다.
                </p>

                <!-- 맺음말 — 광고가 아니라 인사다. 제안·권유·혜택 문구는 넣지 않는다. -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;background:#FFF7E9;border-radius:14px;">
                  <tr>
                    <td style="padding:20px 22px;">
                      <p style="margin:0 0 10px;font-size:14px;line-height:1.85;color:#7A5B3A;">
                        요양의 하루는 밖에서 잘 보이지 않습니다. 새벽에 불을 켜고, 식사를 챙기고,
                        밤사이 몇 번씩 살피는 일들은 기록에도 잘 남지 않지요.
                        저희는 그 보이지 않는 시간이 쌓여 우리 사회를 조금씩 더 따뜻하게 만들고
                        있다고 믿습니다.
                      </p>
                      <p style="margin:0;font-size:14px;line-height:1.85;color:#7A5B3A;">
                        오늘 도착한 이 문의도, 그 시간을 믿고 문을 두드린 한 가족의 마음입니다.
                        <strong style="color:#B15E13;">귀 시설이 걸어가시는 길을 진심으로 응원합니다.</strong>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background:#F7F5FB;text-align:center;">
                <p style="margin:0;font-size:12px;line-height:1.7;color:#A9A3BC;">
                  이 메일은 ${SITE_NAME} 이용자가 귀 시설에 남긴 상담 신청을 전달하는
                  안내 메일이며, 광고성 정보가 아니에요.<br />
                  <a href="${SITE_URL}" style="color:#FF6250;">${SITE_URL.replace(/^https?:\/\//, "")}</a>
                  · 운영 주체와 데이터 출처는
                  <a href="${SITE_URL}/about" style="color:#FF6250;">/about</a>,
                  <a href="${SITE_URL}/data-policy" style="color:#FF6250;">/data-policy</a>
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

// 돌봄 합의서 사본 메일 — 양측이 서명을 마치면 각자에게 같은 사본을 보낸다.
//
// 왜 이메일인가: 합의서가 우리 서버에만 있으면 "돌보다가 보관한 문서"에 머무른다.
// 각자 자기 메일함에 사본을 갖고 있어야 나중에 다투게 됐을 때 당사자가 직접
// 제시할 수 있다(서비스 탈퇴·서버 사고와 무관하게 남는다).
//
// 광고성 문구는 넣지 않는다 — 본인이 서명한 문서의 사본을 전달하는 거래성 정보다.
export function agreementCopyEmailHtml(params: {
  docNo: string;
  contentHash: string;
  guardianName: string;
  guardianSignedAt: string;
  sitterName: string;
  sitterSignedAt: string;
  terms: { label: string; value: string }[];
  clauses: { title: string; body: string }[];
  viewUrl: string;
}): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 0;color:#6B647F;font-size:13px;width:110px;">${esc(label)}</td>
      <td style="padding:8px 0;color:#1B1730;font-size:13px;font-weight:600;">${esc(value)}</td>
    </tr>`;

  return `
<!doctype html>
<html lang="ko">
  <body style="margin:0;padding:0;background:#FFFBF3;font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic',sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBF3;padding:28px 14px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:24px 24px 16px;border-bottom:1px solid #EFEDF3;">
            <p style="margin:0 0 4px;color:#FF6250;font-size:13px;font-weight:800;">돌보다</p>
            <h1 style="margin:0;color:#1B1730;font-size:20px;font-weight:800;">돌봄 합의서</h1>
            <p style="margin:6px 0 0;color:#9C97AC;font-size:12px;">문서번호 ${esc(params.docNo)}</p>
          </td></tr>

          <tr><td style="padding:18px 24px;">
            <p style="margin:0 0 14px;color:#3A3452;font-size:13px;line-height:1.7;">
              보호자와 돌보다 매니저 두 분이 모두 서명을 마쳐 합의서가 완성되었습니다.
              이 메일은 <b>본인이 서명한 문서의 사본</b>이며, 각자 보관하실 수 있도록 양측에 동일하게 보내드립니다.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${params.terms.map((t) => row(t.label, t.value)).join("")}
            </table>
          </td></tr>

          <tr><td style="padding:0 24px 18px;">
            <div style="background:#F5F4F9;border-radius:12px;padding:14px;">
              <p style="margin:0 0 8px;color:#1B1730;font-size:13px;font-weight:700;">서명 기록</p>
              <p style="margin:0 0 4px;color:#3A3452;font-size:12px;">보호자 ${esc(params.guardianName)} · ${esc(params.guardianSignedAt)}</p>
              <p style="margin:0;color:#3A3452;font-size:12px;">돌보다 매니저 ${esc(params.sitterName)} · ${esc(params.sitterSignedAt)}</p>
            </div>
          </td></tr>

          <tr><td style="padding:0 24px 18px;">
            <p style="margin:0 0 10px;color:#1B1730;font-size:13px;font-weight:700;">합의 조항</p>
            ${params.clauses
              .map(
                (c) => `
              <p style="margin:0 0 3px;color:#1B1730;font-size:12px;font-weight:700;">${esc(c.title)}</p>
              <p style="margin:0 0 10px;color:#6B647F;font-size:12px;line-height:1.7;">${esc(c.body)}</p>`
              )
              .join("")}
          </td></tr>

          <tr><td style="padding:0 24px 24px;">
            <a href="${params.viewUrl}" style="display:block;background:#FF6250;color:#ffffff;text-decoration:none;text-align:center;padding:14px;border-radius:12px;font-size:14px;font-weight:700;">
              합의서 원본 열기 (인쇄·PDF 저장)
            </a>
            <p style="margin:10px 0 0;color:#9C97AC;font-size:11px;line-height:1.6;">
              위 버튼으로 원본을 열어 브라우저의 인쇄 기능에서 &lsquo;PDF로 저장&rsquo;을 고르면 PDF 파일로 보관하실 수 있어요.
            </p>
          </td></tr>

          <tr><td style="padding:16px 24px;background:#FAFAFC;border-top:1px solid #EFEDF3;">
            <p style="margin:0 0 6px;color:#6B647F;font-size:11px;line-height:1.7;">
              이 합의는 <b>보호자와 돌보다 매니저 두 분 사이의 합의</b>입니다. 돌보다는 합의의 당사자가 아니며,
              표준 양식을 제공하고 서명 사실을 기록·보관할 뿐 사례비 결정·지급이나 돌봄 이행에 관여하지 않습니다.
            </p>
            <p style="margin:0;color:#9C97AC;font-size:10px;word-break:break-all;">
              문서 지문(SHA-256): ${esc(params.contentHash)}
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}
