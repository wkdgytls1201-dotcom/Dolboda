// 배치 알림 메일의 공용 껍데기 — 로고 헤더 · 코랄 그라데이션 히어로 · 돌보다 소개 · 푸터.
//
// 왜 만들었나: 발송 스크립트 6개가 각자 <!doctype html>부터 푸터까지 복붙해 갖고 있었다.
// 디자인을 고치려면 여섯 번 고쳐야 하고, 실제로 조금씩 달라져 브랜드가 흐트러져 있었다.
// 여기 한 곳만 고치면 모든 알림 메일이 같이 바뀐다.
//
// 기준 디자인은 lib/resend.ts의 업체 문의 전달 메일이다(로고+워드마크 헤더, 따뜻한
// 그라데이션 블록, 돌보다 소개). 그 격을 배치 알림에도 맞춘다.
//
// ── 메일 HTML의 제약 (지키지 않으면 아웃룩·네이버에서 깨진다) ──
//  · 레이아웃은 전부 <table>. flex/grid는 아웃룩이 모른다.
//  · 스타일은 전부 인라인. <style> 블록은 상당수 클라이언트가 지운다.
//  · 그라데이션은 아웃룩이 무시하므로 bgcolor 속성으로 단색 폴백을 함께 준다.
//  · 버튼은 <a>에 padding만 주면 아웃룩에서 클릭 영역이 글자만큼만 잡힌다 —
//    table로 감싸는 "bulletproof button" 형태로 만든다.
//  · 한글은 word-break:keep-all이 없으면 단어 중간에서 잘린다.

// ⚠️ lib/siteConfig.ts의 SITE_SLOGAN과 같은 값이어야 한다.
//    순수 node 스크립트라 TS 파일을 직접 import할 수 없어 사본을 둔다(이 프로젝트의
//    기존 방식 — LOCATION_TYPE_LABEL 등도 같은 이유로 복제돼 있다).
export const SITE_SLOGAN = "공공데이터로 찾는 믿을 수 있는 요양시설";

export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * 알림 메일 한 통을 그린다.
 *
 * @param {object} p
 * @param {string} p.siteUrl
 * @param {string} p.siteName
 * @param {string} p.preheader  받은편지함 미리보기에 뜨는 한 줄(본문에는 안 보인다).
 *                              이게 없으면 메일 앱이 헤더의 "돌보다" 같은 조각을 주워
 *                              미리보기에 띄운다 — 열어볼지 말지가 여기서 갈린다.
 * @param {string} p.eyebrow    히어로 위 작은 라벨("관심시설 알림")
 * @param {string} p.title      히어로 제목(흰 글씨)
 * @param {string} [p.subtitle] 히어로 보조 문장
 * @param {string} p.bodyHtml   본문 HTML(카드 등)
 * @param {string} [p.ctaText]
 * @param {string} [p.ctaHref]
 * @param {string} [p.note]     본문 아래 회색 주의문
 * @param {string} [p.footerLinkText]
 * @param {string} [p.footerLinkHref]
 * @param {boolean} [p.withIntro=true] 돌보다 소개 블록 노출 여부
 */
export function renderEmail(p) {
  const {
    siteUrl,
    siteName,
    preheader,
    eyebrow,
    title,
    subtitle = "",
    bodyHtml,
    ctaText,
    ctaHref,
    note = "",
    footerLinkText = "알림 설정 변경·수신 거부",
    footerLinkHref = `${siteUrl}/notifications`,
    withIntro = true,
  } = p;

  const host = siteUrl.replace(/^https?:\/\//, "");

  // 미리보기 텍스트 — 숨기되 메일 앱은 읽는다. 뒤의 공백 문자는 미리보기에 본문 앞부분이
  // 딸려 나오는 것을 밀어내는 오래된 관용구다.
  const preheaderBlock = `
<div style="display:none;font-size:1px;color:#FFFBF3;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  ${esc(preheader)}${"&#847;&zwnj;&nbsp;".repeat(60)}
</div>`;

  const cta =
    ctaText && ctaHref
      ? `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto 0;">
  <tr>
    <td bgcolor="#FF6250" style="border-radius:12px;background:#FF6250;background-image:linear-gradient(135deg,#FF6250 0%,#FF7A61 100%);">
      <a href="${ctaHref}" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:12px;">${esc(ctaText)} &rarr;</a>
    </td>
  </tr>
</table>`
      : "";

  // 돌보다 소개 — 메일은 사이트 밖에서 읽히니 "이게 뭐 하는 곳인지"가 없으면 광고로 읽힌다.
  // 업체 메일의 소개 단락을 알림 메일 길이에 맞게 줄였다(같은 사실, 같은 기조).
  const intro = withIntro
    ? `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFF7E9" style="margin:26px 0 0;background:#FFF7E9;background-image:linear-gradient(135deg,#FFF9EF 0%,#FFF1DF 100%);border-radius:18px;">
  <tr>
    <td style="padding:22px 22px 20px;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:800;color:#B15E13;word-break:keep-all;">${esc(siteName)}는 어떤 곳인가요</p>
      <p style="margin:0 0 10px;font-size:13.5px;line-height:1.85;color:#7A5B3A;word-break:keep-all;">
        보호자가 믿을 수 있는 요양시설을 찾는 일은 여전히 어렵습니다. 시설마다 안내 기준이
        다르고, 비용과 인력을 나란히 놓고 보기도 쉽지 않습니다.
      </p>
      <p style="margin:0;font-size:13.5px;line-height:1.85;color:#7A5B3A;word-break:keep-all;">
        ${esc(siteName)}는 <strong style="color:#B15E13;">국민건강보험공단·건강보험심사평가원</strong>이 공개한
        자료로 전국 요양시설 <strong style="color:#B15E13;">2만 8천여 곳</strong>의 평가등급·비용·인력 현황을
        한곳에 모아, 돌봄 정보의 격차를 좁히고 있습니다.
      </p>
    </td>
  </tr>
</table>`
    : "";

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:#FFFBF3;font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic','Apple SD Gothic Neo',sans-serif;">
${preheaderBlock}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBF3;padding:28px 14px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 4px 18px rgba(27,23,48,0.07);">

      <!-- 헤더 — 로고 + 워드마크 + 슬로건. 업체 메일과 같은 구성이라 어느 메일을 받아도
           같은 브랜드로 읽힌다. -->
      <tr>
        <td style="padding:18px 24px 15px;border-bottom:1px solid #F4F1FA;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td width="44" valign="middle" style="width:44px;">
                <a href="${siteUrl}" style="text-decoration:none;">
                  <img src="${siteUrl}/logo.png" alt="${esc(siteName)}" width="40" height="40" style="display:block;border:0;border-radius:10px;" />
                </a>
              </td>
              <td valign="middle" style="padding-left:11px;">
                <a href="${siteUrl}" style="text-decoration:none;color:#FF6250;font-size:19px;font-weight:800;letter-spacing:-0.3px;">${esc(siteName)}</a>
                <div style="margin-top:2px;font-size:12px;color:#A9A3BC;letter-spacing:-0.2px;">${esc(SITE_SLOGAN)}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- 코랄 그라데이션 히어로 — 무슨 소식인지 한눈에.
           bgcolor는 그라데이션을 못 그리는 아웃룩용 단색 폴백이다. -->
      <tr>
        <td bgcolor="#FF6250" style="background:#FF6250;background-image:linear-gradient(135deg,#FF6250 0%,#FF8A72 55%,#FFB07E 100%);padding:26px 24px;">
          ${eyebrow ? `<p style="margin:0 0 7px;font-size:12px;font-weight:800;letter-spacing:0.4px;color:#FFE2DD;">${esc(eyebrow)}</p>` : ""}
          <p style="margin:0;font-size:20px;line-height:1.5;font-weight:800;color:#ffffff;word-break:keep-all;">${esc(title)}</p>
          ${subtitle ? `<p style="margin:9px 0 0;font-size:14px;line-height:1.7;color:#FFEFEA;word-break:keep-all;">${esc(subtitle)}</p>` : ""}
        </td>
      </tr>

      <tr>
        <td style="padding:24px;">
          ${bodyHtml}
          ${cta}
          ${note ? `<p style="margin:20px 0 0;font-size:12px;line-height:1.75;color:#A9A3BC;word-break:keep-all;">${esc(note)}</p>` : ""}
          ${intro}
        </td>
      </tr>

      <tr>
        <td style="padding:16px 24px 18px;background:#FAF8FD;text-align:center;">
          <a href="${footerLinkHref}" style="color:#8A839E;font-size:12px;text-decoration:underline;">${esc(footerLinkText)}</a>
          <p style="margin:9px 0 0;font-size:11px;line-height:1.7;color:#B9B3C7;">
            ${esc(siteName)} · <a href="${siteUrl}" style="color:#B9B3C7;text-decoration:none;">${host}</a><br />
            표시된 정보는 공공데이터 기반으로 실제와 다를 수 있습니다.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** 본문에 넣는 시설·항목 카드 한 장 */
export function infoCard({ title, detail, linkText, linkHref, badge }) {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:11px;border:1px solid #F0EDF6;border-radius:15px;">
  <tr><td style="padding:16px 18px;">
    ${badge ? `<p style="margin:0 0 8px;"><span style="display:inline-block;padding:3px 10px;background:#FFF3F1;border-radius:999px;font-size:11px;font-weight:800;color:#EB4632;">${esc(badge)}</span></p>` : ""}
    <p style="margin:0 0 6px;font-size:16px;font-weight:800;color:#1B1730;word-break:keep-all;">${esc(title)}</p>
    <p style="margin:0 0 12px;font-size:13.5px;line-height:1.65;color:#3A3452;word-break:keep-all;">${esc(detail)}</p>
    <a href="${linkHref}" style="color:#FF6250;font-size:13.5px;font-weight:800;text-decoration:none;">${esc(linkText)} &rarr;</a>
  </td></tr>
</table>`;
}
