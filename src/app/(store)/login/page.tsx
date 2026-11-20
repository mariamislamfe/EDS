import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { t } = await getI18n();
  const { next } = await searchParams;
  const safe = next?.startsWith("/") && !next.startsWith("//") ? next : "/account";
  return (
    <AuthShell title={t.auth.signIn} footer={<>{t.auth.noAccount} <Link className="font-medium text-teal-strong hover:underline" href={`/register?next=${encodeURIComponent(safe)}`}>{t.auth.signUp}</Link></>}>
      <LoginForm next={safe} />
    </AuthShell>
  );
}
