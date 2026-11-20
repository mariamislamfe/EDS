import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { robots: { index: false } };

/** Target of the password-reset email link (Neon Auth appends ?token=…). */
export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { t } = await getI18n();
  const { token, error } = await searchParams;
  if (!token || error) {
    return (
      <AuthShell title={t.auth.updatePassword}>
        <p className="mb-6 text-muted">{t.auth.invalid}</p>
        <Link href="/forgot-password" className="btn btn-primary">{t.auth.sendReset}</Link>
      </AuthShell>
    );
  }
  return <AuthShell title={t.auth.updatePassword}><ResetForm token={token} /></AuthShell>;
}
