import type { Metadata } from "next";
import Link from "next/link";
import { getGovernorates, getSettings } from "@/lib/catalog";
import { getI18n } from "@/lib/i18n/server";
import { getViewer } from "@/lib/auth/session";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.checkout.title, robots: { index: false } };
}

export default async function CheckoutPage() {
  const { t } = await getI18n();
  const [governorates, settings, user] = await Promise.all([getGovernorates(), getSettings(), getViewer()]);
  const profile = user ? { full_name: user.name, phone: user.phone, email: user.email } : null;
  return (
    <div className="container-x pb-10 pt-10">
      <h1 className="mb-3 text-[clamp(2rem,4.5vw,3.2rem)] font-bold leading-none tracking-[-0.03em] rtl:leading-tight rtl:tracking-normal">{t.checkout.title}</h1>
      {!user && <p className="mb-8 text-sm text-muted">{t.checkout.signInHint} <Link href="/login?next=/checkout" className="font-medium text-teal-strong hover:underline">{t.nav.login}</Link></p>}
      <CheckoutForm
        governorates={governorates}
        paymentMethods={settings.paymentMethods.filter((m) => m.enabled)}
        emailRequired={settings.checkout.email_required}
        prefill={{ name: profile?.full_name ?? "", phone: profile?.phone ?? "", email: profile?.email ?? user?.email ?? "" }}
      />
    </div>
  );
}
