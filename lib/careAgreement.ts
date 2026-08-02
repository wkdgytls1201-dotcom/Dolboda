// 돌봄 합의서 — 보호자와 돌보다 매니저가 직접 맺는 합의의 표준 양식.
//
// ★ 돌보다의 위치: 이 합의의 당사자가 아니다. 양식을 제공하고 서명 사실을 기록·보관할
//   뿐이며, 사례비 결정·지급·이행에 관여하지 않는다. 이 원칙이 흔들리면 직업안정법상
//   유료직업소개사업 등록 문제가 생기므로, 조항 문구를 고칠 때 반드시 지킬 것.
//
// ⚠️ 아래 조항은 참고용 표준 문안이지 법률 자문이 아니다. 실제 서비스 확대 전
//   변호사 검토를 받는 것을 전제로 한다.

export interface AgreementParty {
  /** 표시용 이름(보호자는 마스킹된 이름일 수 있음) */
  name: string;
  role: "보호자" | "돌보다 매니저";
  /** 매니저의 경력·자격 등 신뢰 정보 (보호자 쪽은 비움) */
  note?: string;
}

export interface AgreementTerms {
  /** 돌봄 장소 유형 — 병원/자택/가사 */
  locationType: string;
  region: string;
  locationNote: string | null;
  startDate: string;
  endDate: string;
  timeRange: string;
  /** 돌봄 받으실 분 표시(이름은 마스킹) */
  recipient: string;
  /** 합의된 업무 범위 — 요청서의 도움 항목·가사 항목을 그대로 옮긴 것 */
  duties: string[];
  /** 사례비 — 두 당사자가 정한 값. 미정이면 null */
  payAmount: number | null;
  payUnit: string | null;
  specialRequests: string[];
  note: string | null;
}

export interface AgreementContent {
  /** 양식 버전 — 조항이 바뀌면 올린다(과거 서명본은 그때 버전으로 남는다) */
  version: string;
  issuedAt: string;
  parties: { guardian: AgreementParty; sitter: AgreementParty };
  terms: AgreementTerms;
  clauses: { title: string; body: string }[];
}

// 조항이 바뀌면 올린다 — 이미 서명된 합의서는 서명 당시 버전의 조항을 그대로 품고 있어
// 나중에 양식을 고쳐도 소급되지 않는다(content에 조항 전문이 통째로 들어가기 때문).
export const AGREEMENT_VERSION = "1.1";

/**
 * 표준 조항. 돌봄 현장에서 실제로 분쟁이 나는 지점 위주로 담았다.
 * (업무 범위, 의료행위 경계, 사고 책임, 중도 해지, 개인정보)
 */
export function standardClauses(terms: AgreementTerms): { title: string; body: string }[] {
  const pay =
    terms.payAmount != null
      ? `${terms.payUnit === "시간" ? "시간당" : "1일"} ${terms.payAmount.toLocaleString()}원`
      : "두 당사자가 별도로 정한 금액";

  return [
    {
      title: "제1조 (합의의 목적과 당사자)",
      body:
        "이 합의서는 보호자와 돌보다 매니저가 돌봄 제공에 관하여 서로 확인한 내용을 정리한 것입니다. " +
        "이 합의의 당사자는 보호자와 돌보다 매니저 두 사람뿐이며, 돌보다(이하 '회사')는 " +
        "이 합의의 당사자가 아닙니다. 회사는 두 당사자가 서로를 찾을 수 있도록 정보를 게시·전달하는 " +
        "온라인 플랫폼을 제공하고, 이 표준 양식과 서명 기록 보관 기능을 제공할 뿐입니다.",
    },
    {
      title: "제2조 (회사의 지위와 책임 범위)",
      body:
        "① 회사는 돌봄 용역의 제공자가 아니며, 매니저를 고용하거나 지휘·감독하지 않습니다. " +
        "회사와 매니저 사이에는 고용·위임·도급 등 어떠한 근로관계도 성립하지 않습니다. " +
        "② 회사는 사례비를 정하거나 대신 지급·정산하지 않으며, 두 당사자 사이의 금전 거래에 " +
        "관여하지 않습니다. " +
        "③ 회사는 이 합의 내용의 적법성·타당성이나 상대방의 신원·자격·능력을 보증하지 않습니다. " +
        "매니저의 경력·자격 정보는 본인이 등록한 것으로, 두 당사자는 서로를 직접 확인할 책임이 있습니다. " +
        "④ 돌봄 과정에서 발생한 사고·상해·질병 악화·분실·금전 분쟁 등 일체의 손해에 대하여 " +
        "회사는 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다. " +
        "⑤ 두 당사자는 필요한 경우 상해보험·배상책임보험 가입 등으로 스스로 대비합니다.",
    },
    {
      title: "제3조 (돌봄 기간과 장소)",
      body:
        `돌봄 기간은 ${terms.startDate}부터 ${terms.endDate}까지이며, 시간은 ${terms.timeRange}입니다. ` +
        `장소는 ${terms.region}${terms.locationNote ? ` ${terms.locationNote}` : ""}입니다. ` +
        "기간·시간·장소를 변경할 때에는 두 당사자가 사전에 합의합니다.",
    },
    {
      title: "제4조 (업무 범위)",
      body:
        (terms.duties.length > 0
          ? `합의된 업무는 다음과 같습니다: ${terms.duties.join(", ")}. `
          : "합의된 업무 범위는 두 당사자가 협의하여 정합니다. ") +
        "이 범위를 벗어나는 업무를 요청하거나 수행할 때에는 사전에 서로 동의해야 하며, " +
        "추가 업무에 따른 사례비 조정도 함께 협의합니다.",
    },
    {
      title: "제5조 (의료행위 금지)",
      body:
        "돌보다 매니저는 의료인이 아니므로 의료법에서 정한 의료행위(투약 지시, 주사, 석션, " +
        "경관영양, 상처 처치 등)를 수행할 수 없습니다. 보호자는 이러한 행위를 요청하지 않으며, " +
        "필요한 경우 의료기관이나 방문간호 등 자격을 갖춘 인력을 통해 처리합니다.",
    },
    {
      title: "제6조 (사례비와 지급)",
      body:
        `사례비는 ${pay}으로 두 당사자가 정하였습니다. 지급 시기·방법은 두 당사자가 직접 정하며, ` +
        "회사는 사례비를 정하거나 대신 지급·정산하지 않습니다.",
    },
    {
      title: "제7조 (중도 변경과 해지)",
      body:
        "부득이한 사정으로 돌봄을 중단해야 할 경우, 가능한 한 3일 전까지 상대방에게 알립니다. " +
        "이미 제공된 돌봄에 대한 사례비는 실제 제공된 기간에 따라 정산합니다. " +
        "어르신의 건강 상태가 급격히 변하여 돌봄이 어려워진 경우에는 즉시 협의합니다.",
    },
    {
      title: "제8조 (안전과 사고)",
      body:
        "두 당사자는 어르신의 안전을 최우선으로 합니다. 돌봄 중 사고가 발생한 경우 즉시 서로에게 " +
        "알리고 필요한 응급조치를 취합니다. 사고에 대한 책임은 관계 법령과 당사자 간 합의에 따르며, " +
        "회사는 이 합의의 당사자가 아니므로 돌봄 과정에서 발생한 사고에 대하여 책임지지 않습니다.",
    },
    {
      title: "제9조 (개인정보와 비밀유지)",
      body:
        "돌보다 매니저는 돌봄 과정에서 알게 된 어르신과 가족의 건강 상태·생활 정보를 " +
        "돌봄 목적 외로 사용하거나 제3자에게 알리지 않습니다. 이 의무는 돌봄이 끝난 뒤에도 유지됩니다.",
    },
    {
      title: "제10조 (분쟁 해결)",
      body:
        "이 합의와 관련하여 분쟁이 생긴 경우 두 당사자가 성실히 협의하여 해결합니다. " +
        "협의가 이루어지지 않으면 관계 법령에 따릅니다. 회사는 분쟁의 당사자가 아니며, " +
        "다만 보관 중인 합의서 기록을 당사자의 요청에 따라 제공할 수 있습니다.",
    },
  ];
}

/**
 * 해시 계산 전 문서를 정규화한다 — 키 순서가 달라도 같은 문자열이 나오게.
 * 나중에 검증할 때 직렬화 방식이 조금 달라졌다는 이유로 위변조로 오판하면 안 된다.
 *
 * 실제 해싱은 서버 전용(lib/careAgreementHash.ts) — node:crypto를 이 파일에서 쓰면
 * 합의서 화면(클라이언트 컴포넌트)이 이 모듈을 타고 crypto 폴리필까지 끌어와
 * 번들이 두 배가 된다(실측: 236KB → 분리 후 정상).
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

/** 문서 번호 — 사람이 눈으로 대조하기 좋은 형태(발급일 + id 앞 8자리) */
export function agreementDocNo(id: string, issuedAt: string): string {
  return `DB-${issuedAt.slice(0, 10).replace(/-/g, "")}-${id.slice(0, 8).toUpperCase()}`;
}
