import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { t } = await getI18n();
  const { next } = await searchParams;
  const safe = next?.startsWith("/") && !next.startsWith("//") ? next : "/account";
  return (
    <AuthShell title={t.auth.signUp} footer={<>{t.auth.haveAccount} <Link className="font-medium text-teal-strong hover:underline" href={`/login?next=${encodeURIComponent(safe)}`}>{t.auth.signIn}</Link></>}>
      <RegisterForm next={safe} />
    </AuthShell>
  );
}
