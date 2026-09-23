export type ConsentType = "terms" | "privacy" | "marketing_email" | "marketing_sms";
type Section = { id: string; title: string; text: string };
type DocumentState =
  | { status: "draft"; version: null; effectiveDate: null }
  | { status: "active"; version: string; effectiveDate: string };
export type LegalDocument = DocumentState & {
  title: string;
  path: string;
  sections: readonly Section[];
};

// Activation requires approved, complete content. No version is assigned to drafts.
// Published versions use YYYY-MM-DD.rN (revision starts at 1); effectiveDate uses YYYY-MM-DD.
export const legalDocuments: Record<ConsentType, LegalDocument> = {
  terms: {
    title: "이용약관", path: "/terms", status: "draft", version: null, effectiveDate: null,
    sections: [
      { id: "service", title: "서비스 이용 및 회원", text: "서비스 범위, 회원가입·탈퇴, 이용자의 권리와 의무를 확정한 후 게시할 예정입니다." },
      { id: "transactions", title: "상품 거래 및 고객 지원", text: "주문·결제·배송·취소·교환·환불 및 분쟁 처리 기준은 운영 정책과 법률 검토 후 게시할 예정입니다." },
      { id: "operator", title: "사업자 정보 및 시행", text: "운영 사업자 정보, 문의처, 약관 변경 절차와 시행일은 확인 후 게시할 예정입니다." },
    ],
  },
  privacy: {
    title: "개인정보 처리방침 및 수집·이용 안내", path: "/privacy", status: "draft", version: null, effectiveDate: null,
    sections: [
      { id: "collection", title: "필수 개인정보 수집·이용 동의 안내", text: "수집 항목, 이용 목적, 보유·이용 기간, 동의 거부 권리 및 거부 시 불이익은 확정 후 게시할 예정입니다. 처리방침 공개와 수집·이용 동의는 구분하여 검토합니다." },
      { id: "processing", title: "처리방침", text: "처리 근거, 파기, 위탁·제3자 제공·국외 이전 여부, 정보주체 권리 행사 방법 및 보호 담당 연락처는 실제 운영 내용을 확인한 후 게시할 예정입니다." },
    ],
  },
  marketing_email: {
    title: "이메일 마케팅 수신 동의", path: "/privacy#marketing-email", status: "draft", version: null, effectiveDate: null,
    sections: [{ id: "marketing-email", title: "선택: 이메일 마케팅 수신", text: "이메일 마케팅의 이용 항목·목적·보유 기간·수신 철회 방법은 검토 중입니다. 선택하지 않아도 회원가입할 수 있으며 현재 선택값은 실제 수신 동의로 저장되지 않습니다." }],
  },
  marketing_sms: {
    title: "SMS 마케팅 수신 동의", path: "/privacy#marketing-sms", status: "draft", version: null, effectiveDate: null,
    sections: [{ id: "marketing-sms", title: "선택: SMS 마케팅 수신", text: "SMS 마케팅의 이용 항목·목적·보유 기간·수신 철회 방법은 검토 중입니다. 선택하지 않아도 회원가입할 수 있으며 현재 선택값은 실제 수신 동의로 저장되지 않습니다." }],
  },
};
