import type { Metadata } from "next";
import LegalDocument from "@/app/components/LegalDocument";
import { legalDocuments } from "@/lib/legal/documents";

export const metadata: Metadata = { title: "개인정보 안내 | GROOZAM", robots: { index: false } };
export default function PrivacyPage() {
  return <LegalDocument document={legalDocuments.privacy} related={[legalDocuments.marketing_email, legalDocuments.marketing_sms]} />;
}
