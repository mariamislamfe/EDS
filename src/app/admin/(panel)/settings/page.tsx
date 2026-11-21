import { requireStaffPage } from "@/lib/admin/auth";
import { q } from "@/lib/db";
import { loadEntityRows } from "@/components/admin/EntityPage";
import { EntityManager } from "@/components/admin/EntityManager";
import { CheckoutShippingForm, MetaPixelForm, PasswordForm, PaymentsForm, StoreForm } from "@/components/admin/SettingsForms";
import { PageHeader } from "@/components/admin/ui";
import type { PaymentMethod, StoreSettings } from "@/lib/types";

export const metadata = { title: "Store settings" };

export default async function SettingsAdmin() {
  await requireStaffPage();
  const [settings, govs] = await Promise.all([
    q<{ key: string; value: unknown }>(`select key, value from settings where key not like 'private_%'`),
    loadEntityRows("governorates"),
  ]);
  const get = <T,>(k: string, fallback: T) => ((settings ?? []).find((s) => s.key === k)?.value as T) ?? fallback;
  return (
    <>
      <PageHeader title="Store settings" />
      <div className="flex flex-col gap-6">
        <StoreForm value={get<StoreSettings>("store", {} as StoreSettings)} />
        <PaymentsForm value={get<PaymentMethod[]>("payment_methods", [])} />
        <MetaPixelForm value={get<{ ids: string[] }>("meta_pixel", { ids: [] })} />
        <PasswordForm />
        <CheckoutShippingForm checkout={get("checkout", { email_required: false })} shipping={get("shipping", { free_shipping_threshold: null })} />
        <div>
          <h2 className="mb-1 mt-6 text-xl font-semibold">Shipping fees by governorate</h2>
          <p className="mb-2 text-sm text-muted">Governorates without a fee show “confirmed by phone” at checkout. Turn off “Deliver here” to stop accepting orders for a governorate.</p>
          <EntityManager entity="governorates" rows={govs} />
        </div>
      </div>
    </>
  );
}
