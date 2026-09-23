import type { Metadata } from "next";
import LegalDocument from "@/app/components/LegalDocument";
import { legalDocuments } from "@/lib/legal/documents";

export const metadata: Metadata = { title: "이용약관 | GROOZAM", robots: { index: false } };
export default function TermsPage() {
  return <LegalDocument document={legalDocuments.terms} />;
}
