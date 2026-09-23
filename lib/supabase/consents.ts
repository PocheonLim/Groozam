import { legalDocuments, type ConsentType } from "@/lib/legal/documents";

export type { ConsentType } from "@/lib/legal/documents";
export type ConsentChoices = Record<ConsentType, boolean>;
export const consentTypes: readonly ConsentType[] = ["terms", "privacy", "marketing_email", "marketing_sms"];
export const emptyConsentChoices: ConsentChoices = { terms: false, privacy: false, marketing_email: false, marketing_sms: false };
export const consentDocuments = {
  terms: { required: true, label: "이용약관 동의", document: legalDocuments.terms },
  privacy: { required: true, label: "개인정보 수집·이용 동의", document: legalDocuments.privacy },
  marketing_email: { required: false, label: "이메일 마케팅 수신 동의", document: legalDocuments.marketing_email },
  marketing_sms: { required: false, label: "SMS 마케팅 수신 동의", document: legalDocuments.marketing_sms },
};

export function validateRequiredConsents(choices: ConsentChoices): string | null {
  if (choices.terms !== true) return "필수 이용약관 동의 항목을 체크해 주세요.";
  if (choices.privacy !== true) return "필수 개인정보 수집·이용 동의 항목을 체크해 주세요.";
  return null;
}

// Readiness only. This does not enable DB writes or certify legal approval.
export function getActiveConsentVersions(): Record<ConsentType, string> | null {
  const versions = {} as Record<ConsentType, string>;
  for (const type of consentTypes) {
    const document = legalDocuments[type];
    if (document.status !== "active" || !/^\d{4}-\d{2}-\d{2}\.r[1-9]\d*$/.test(document.version) || !/^\d{4}-\d{2}-\d{2}$/.test(document.effectiveDate)) return null;
    versions[type] = document.version;
  }
  return versions;
}
