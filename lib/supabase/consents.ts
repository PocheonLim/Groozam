// No published documents/versions currently exist. Null means recording is
// unavailable, not a default document version. No consent write is wired yet.
export type ConsentType = "terms" | "privacy" | "marketing_email" | "marketing_sms";
export type ConsentDocument = { version: string; path: string };
export const consentDocuments: Record<ConsentType, { required: boolean; document: ConsentDocument | null }> = {
  terms: { required: true, document: null },
  privacy: { required: true, document: null },
  marketing_email: { required: false, document: null },
  marketing_sms: { required: false, document: null },
};
