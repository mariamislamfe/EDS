import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { robots: { index: false } };

export default async function ForgotPage() {
  const { t } = await getI18n();
  return <AuthShell title={t.auth.forgot}><ForgotForm /></AuthShell>;
}
