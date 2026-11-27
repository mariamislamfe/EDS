import type { Metadata } from "next";
import { getGovernorates, getSettings } from "@/lib/catalog";
import { getI18n } from "@/lib/i18n/server";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getCustomer } from "@/lib/customer/auth";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.checkout.title, robots: { index: false } };
}

export default async function CheckoutPage() {
  const { t } = await getI18n();
  const [governorates, settings, customer] = await Promise.all([getGovernorates(), getSettings(), getCustomer()]);
  return (
    <div className="container-x pb-10 pt-10">
      <h1 className="mb-8 text-[clamp(2rem,4.5vw,3.2rem)] font-bold leading-none tracking-[-0.03em] rtl:leading-tight rtl:tracking-normal">{t.checkout.title}</h1>
      <CheckoutForm
        governorates={governorates}
        paymentMethods={settings.paymentMethods.filter((m) => m.enabled)}
        emailRequired={settings.checkout.email_required}
        customer={customer && { name: customer.name, phone: customer.phone, email: customer.email, governorate_id: customer.governorate_id, city: customer.city, address: customer.address }}
      />
    </div>
  );
}
